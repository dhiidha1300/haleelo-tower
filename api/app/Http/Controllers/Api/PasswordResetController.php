<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthenticationService;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PasswordResetController extends Controller
{
    public function __construct(
        private AuthenticationService $authService,
        private EmailService $emailService
    ) {}

    // POST /api/auth/forgot-password — self-service (public)
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::byEmail($request->email)->first();

        // Always return success to prevent email enumeration
        if (!$user || $user->status !== 'active') {
            return response()->json(['message' => 'If that email is registered, a reset link has been sent.']);
        }

        $this->sendResetEmail($user, $request->getSchemeAndHttpHost());

        return response()->json(['message' => 'If that email is registered, a reset link has been sent.']);
    }

    // POST /api/auth/reset-password — consume token (public)
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'token'    => 'required|string',
            'password' => 'required|string|min:8|confirmed',
            'invite'   => 'nullable|boolean',
        ]);

        $errors = $this->authService->validatePasswordPolicy($request->password);
        if (!empty($errors)) {
            return response()->json(['message' => implode(' ', $errors)], 422);
        }

        // Invite tokens are valid for 24 hours; reset tokens for 60 minutes
        $expiry = $request->boolean('invite') ? 1440 : 60;
        $user   = $this->authService->validateResetToken($request->email, $request->token, $expiry);

        if (!$user) {
            return response()->json(['message' => 'This reset link is invalid or has expired.'], 422);
        }

        $this->authService->consumeResetToken($request->email, $request->password);

        return response()->json(['message' => 'Password reset successfully. You can now log in.']);
    }

    // POST /api/users/{user}/send-reset-link — admin-initiated
    public function sendResetLink(Request $request, User $user): JsonResponse
    {
        $this->sendResetEmail($user, $request->getSchemeAndHttpHost());

        return response()->json(['message' => "Password reset link sent to {$user->email}."]);
    }

    private function sendResetEmail(User $user, string $serverHost): void
    {
        $token    = $this->authService->generateResetToken($user);
        $frontendUrl = env('ADMIN_URL', 'http://localhost:3000');
        $resetUrl = "{$frontendUrl}/auth/reset-password?token={$token}&email=" . urlencode($user->email);

        $this->emailService->sendPasswordReset($user->email, $user->name, $resetUrl);
    }
}
