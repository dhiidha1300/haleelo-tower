<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthenticationService;
use App\Services\AuditService;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function __construct(
        private AuthenticationService $authService,
        private AuditService $auditService,
        private UserService $userService
    ) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8',
        ]);

        $user = $this->authService->login($request->email, $request->password);

        if (!$user) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Invalid credentials or account locked.',
            ], 401);
        }

        // Generate and send OTP if 2FA is enabled
        if ($user->can2FA()) {
            $otp = $this->authService->generateOTP($user);

            // TODO: Send OTP via WhatsApp using NotificationService

            return response()->json([
                'requires_2fa' => true,
                'user_id' => $user->id,
                'message' => '2FA code sent to your phone.',
            ]);
        }

        // Create token and log in
        $token = $this->authService->createLoginToken($user);
        $this->auditService->logLogin($user);

        return response()->json([
            'user' => $this->userService->getUserWithPermissions($user),
            'token' => $token,
        ]);
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

        $token = $this->authService->createLoginToken($user);
        $this->auditService->logLogin($user);

        return response()->json([
            'user' => $this->userService->getUserWithPermissions($user),
            'token' => $token,
        ]);
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

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}
