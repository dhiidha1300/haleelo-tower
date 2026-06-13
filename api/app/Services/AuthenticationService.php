<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthenticationService
{
    public function login(string $email, string $password): ?User
    {
        $user = User::byEmail($email)->first();

        if (!$user) {
            return null;
        }

        if ($user->isLocked()) {
            return null;
        }

        if (!Hash::check($password, $user->password)) {
            $user->incrementFailedLoginAttempts();
            return null;
        }

        $user->resetFailedLoginAttempts();

        return $user;
    }

    public function generateOTP(User $user): string
    {
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store OTP in cache for 5 minutes
        cache()->put("otp:{$user->id}", $otp, now()->addMinutes(5));

        return $otp;
    }

    public function verifyOTP(User $user, string $otp): bool
    {
        $cachedOtp = cache()->get("otp:{$user->id}");

        if (!$cachedOtp || $cachedOtp !== $otp) {
            return false;
        }

        cache()->forget("otp:{$user->id}");

        return true;
    }

    public function createLoginToken(User $user): string
    {
        $hours = (int) \App\Models\SystemSetting::get('session_timeout_hours', 8);
        $expiry = now()->addHours(max(1, $hours));
        return $user->createToken('auth_token', ['*'], $expiry)->plainTextToken;
    }

    public function logout(User $user): bool
    {
        $user->tokens()->delete();
        return true;
    }

    public function generateTemporaryPassword(): string
    {
        return Str::random(12);
    }

    public function validatePasswordPolicy(string $password): array
    {
        $errors = [];

        if (strlen($password) < 8) {
            $errors[] = 'Password must be at least 8 characters.';
        }

        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter.';
        }

        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one number.';
        }

        if (!preg_match('/[!@#$%^&*]/', $password)) {
            $errors[] = 'Password must contain at least one symbol (!@#$%^&*).';
        }

        return $errors;
    }

    public function hashPassword(string $password): string
    {
        return Hash::make($password);
    }

    public function generateResetToken(User $user, int $expiryMinutes = 60): string
    {
        $token = Str::random(64);

        DB::table('password_reset_tokens')->upsert(
            [
                'email'      => $user->email,
                'token'      => Hash::make($token),
                'created_at' => now(),
            ],
            ['email'],
            ['token', 'created_at']
        );

        return $token;
    }

    public function validateResetToken(string $email, string $token, int $expiryMinutes = 60): ?User
    {
        $record = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        if (!$record) return null;

        if (now()->diffInMinutes($record->created_at) > $expiryMinutes) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            return null;
        }

        if (!Hash::check($token, $record->token)) return null;

        return User::byEmail($email)->first();
    }

    public function consumeResetToken(string $email, string $newPassword): bool
    {
        DB::table('password_reset_tokens')->where('email', $email)->delete();
        $user = User::byEmail($email)->first();
        if (!$user) return false;
        $user->update(['password' => Hash::make($newPassword)]);
        return true;
    }
}
