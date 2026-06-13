<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthenticationService;
use App\Services\AuditService;
use App\Services\UserService;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function __construct(
        private AuthenticationService $authService,
        private AuditService $auditService,
        private UserService $userService,
        private WhatsAppService $whatsAppService
    ) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8',
        ]);

        $user = $this->authService->login($request->email, $request->password);

        if (!$user) {
            // Silently log the failed attempt — never let audit errors reach the user
            try {
                $target = \App\Models\User::byEmail($request->email)->withTrashed()->first();
                if ($target) {
                    $this->auditService->logFailedLogin($target, $request->ip());
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to log failed login attempt', ['error' => $e->getMessage()]);
            }

            return response()->json([
                'error'   => 'Unauthorized',
                'message' => 'Invalid credentials or account locked.',
            ], 401);
        }

        // Generate and send OTP if 2FA is required
        if ($user->can2FA()) {
            $otp = $this->authService->generateOTP($user);

            try {
                $this->whatsAppService->sendOtp($user->phone, $otp);
            } catch (\Exception $e) {
                // Log but don't block login — admin can check OTP in audit if WhatsApp fails
                \Illuminate\Support\Facades\Log::error('Failed to send 2FA OTP via WhatsApp', [
                    'user_id' => $user->id,
                    'error'   => $e->getMessage(),
                ]);
            }

            // Mask phone for display: +252 6XX XXX X34
            $maskedPhone = $this->maskPhone($user->phone);

            return response()->json([
                'requires_2fa' => true,
                'user_id'      => $user->id,
                'phone_hint'   => $maskedPhone,
                'message'      => "Verification code sent to {$maskedPhone}.",
                'whatsapp_configured' => $this->whatsAppService->isConfigured(),
            ]);
        }

        // Create token for authentication
        $token = $this->authService->createLoginToken($user);
        $this->auditService->logLogin($user);

        $response = response()->json([
            'requires_2fa' => false,
            'user' => $this->userService->getUserWithPermissions($user),
            'token' => $token,
        ]);

        // Also set token as HTTP-only cookie for middleware to read
        $response->cookie(
            'auth_token',
            $token,
            60 * 24 * 7, // 7 days
            '/',
            '',
            false,
            true // httpOnly
        );

        return $response;
    }

    public function verify2FA(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'otp' => 'required|string|size:6',
        ]);

        $user = \App\Models\User::findOrFail($request->user_id);

        if (!$this->authService->verifyOTP($user, $request->otp)) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Invalid or expired OTP.',
            ], 401);
        }

        // Create token for authentication
        $token = $this->authService->createLoginToken($user);
        $this->auditService->logLogin($user);

        $response = response()->json([
            'user' => $this->userService->getUserWithPermissions($user),
            'token' => $token,
        ]);

        // Also set token as HTTP-only cookie for middleware to read
        $response->cookie(
            'auth_token',
            $token,
            60 * 24 * 7, // 7 days
            '/',
            '',
            false,
            true // httpOnly
        );

        return $response;
    }

    public function resendOtp(Request $request): JsonResponse
    {
        $request->validate(['user_id' => 'required|integer|exists:users,id']);

        $user = \App\Models\User::findOrFail($request->user_id);

        if (!$user->can2FA()) {
            return response()->json(['message' => 'This account does not have a phone number for 2FA.'], 422);
        }

        // Rate-limit: check if an OTP was sent in the last 60 seconds
        $lockKey = "otp_sent:{$user->id}";
        if (cache()->has($lockKey)) {
            $ttl = cache()->getStore()->get($lockKey);
            return response()->json(['message' => 'Please wait before requesting another code.', 'retry_after' => 60], 429);
        }

        $otp = $this->authService->generateOTP($user);

        try {
            $this->whatsAppService->sendOtp($user->phone, $otp);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to resend OTP', ['user_id' => $user->id, 'error' => $e->getMessage()]);
        }

        // Prevent resend for 60 seconds
        cache()->put($lockKey, true, now()->addSeconds(60));

        return response()->json([
            'message'    => 'New code sent to ' . $this->maskPhone($user->phone),
            'phone_hint' => $this->maskPhone($user->phone),
        ]);
    }

    private function maskPhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        $len    = strlen($digits);
        if ($len <= 4) return str_repeat('*', $len);
        return substr($digits, 0, max(1, $len - 6)) . str_repeat('*', 4) . substr($digits, -2);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'name'  => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
        ]);

        $update = array_filter([
            'name'  => $request->input('name'),
            'phone' => $request->input('phone'),
        ], fn($v) => $v !== null);

        if (!empty($update)) {
            $user->update($update);
        }

        // Change password if provided
        if ($request->filled('current_password')) {
            $request->validate([
                'current_password'      => 'required|string',
                'new_password'          => 'required|string|min:8|confirmed',
            ]);

            if (!\Illuminate\Support\Facades\Hash::check($request->current_password, $user->password)) {
                return response()->json(['message' => 'Current password is incorrect.'], 422);
            }

            $errors = $this->authService->validatePasswordPolicy($request->new_password);
            if (!empty($errors)) {
                return response()->json(['message' => implode(' ', $errors)], 422);
            }

            $user->update(['password' => \Illuminate\Support\Facades\Hash::make($request->new_password)]);
        }

        return response()->json($this->userService->getUserWithPermissions($user->fresh()));
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate(['photo' => 'required|image|max:4096']);

        $user = Auth::user();
        $path = $request->file('photo')->store('avatars', 'public');
        $url  = \Illuminate\Support\Facades\Storage::disk('public')->url($path);

        $user->update(['profile_photo_url' => $url]);

        return response()->json($this->userService->getUserWithPermissions($user->fresh()));
    }

    public function me(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Not authenticated.',
            ], 401);
        }

        return response()->json($this->userService->getUserWithPermissions($user));
    }

    public function logout(Request $request): JsonResponse
    {
        $user = Auth::user();

        if ($user) {
            $this->auditService->logLogout($user);
            $this->authService->logout($user);
        }

        $response = response()->json([
            'message' => 'Logged out successfully.',
        ]);

        // Delete the auth token cookie - use empty string for domain to match creation
        $response->cookie('auth_token', '', -1, '/', '', false, true);

        return $response;
    }
}
