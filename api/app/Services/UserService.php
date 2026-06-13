<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class UserService
{
    public function __construct(
        private AuthenticationService $authService,
        private AuditService $auditService,
        private EmailService $emailService
    ) {}

    public function createUser(array $data): User
    {
        $user = User::create([
            'name'               => $data['name'],
            'job_title'          => $data['job_title'] ?? null,
            'email'              => $data['email'],
            'password'           => $this->authService->hashPassword($data['password'] ?? $this->authService->generateTemporaryPassword()),
            'phone'              => $data['phone'] ?? null,
            'status'             => $data['status'] ?? 'active',
            'two_factor_enabled' => $data['two_factor_enabled'] ?? true,
        ]);

        if (!empty($data['role'])) {
            $user->assignRole($data['role']);
        }

        $this->auditService->log('created', User::class, $user->id, null, $user->toArray());

        // Send invite email — failure is non-fatal so user creation still succeeds
        try {
            $this->sendInviteEmail($user->fresh());
        } catch (\Exception $e) {
            Log::warning('Invite email failed for new user', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);
        }

        return $user->fresh();
    }

    public function updateUser(User $user, array $data): User
    {
        $oldData = $user->toArray();

        $updateData = [];

        if (isset($data['name'])) {
            $updateData['name'] = $data['name'];
        }
        if (isset($data['job_title'])) {
            $updateData['job_title'] = $data['job_title'];
        }
        if (isset($data['email'])) {
            $updateData['email'] = $data['email'];
        }
        if (isset($data['phone'])) {
            $updateData['phone'] = $data['phone'];
        }
        if (isset($data['status'])) {
            $updateData['status'] = $data['status'];
        }
        if (isset($data['profile_photo_url'])) {
            $updateData['profile_photo_url'] = $data['profile_photo_url'];
        }
        if (isset($data['two_factor_enabled'])) {
            $updateData['two_factor_enabled'] = (bool) $data['two_factor_enabled'];
        }

        $user->update($updateData);

        if (isset($data['role'])) {
            $user->syncRoles([$data['role']]);
        }

        $this->auditService->log('updated', User::class, $user->id, $oldData, $user->fresh()->toArray());

        return $user->fresh();
    }

    public function deactivateUser(User $user): User
    {
        $oldData = $user->toArray();

        $user->update([
            'status' => 'inactive',
            'deleted_at' => now(),
        ]);

        $this->auditService->log('updated', User::class, $user->id, $oldData, $user->fresh()->toArray());

        return $user;
    }

    public function reactivateUser(User $user): User
    {
        $oldData = $user->toArray();

        $user->update([
            'status' => 'active',
            'deleted_at' => null,
        ]);

        $this->auditService->log('updated', User::class, $user->id, $oldData, $user->fresh()->toArray());

        return $user->fresh();
    }

    public function changePassword(User $user, string $newPassword): bool
    {
        $passwordErrors = $this->authService->validatePasswordPolicy($newPassword);

        if (!empty($passwordErrors)) {
            throw new \InvalidArgumentException(implode(' ', $passwordErrors));
        }

        $oldData = $user->toArray();

        $user->update([
            'password' => $this->authService->hashPassword($newPassword),
        ]);

        $this->auditService->log('updated', User::class, $user->id, $oldData, $user->fresh()->toArray());

        return true;
    }

    public function resetPassword(User $user, string $newPassword): bool
    {
        return $this->changePassword($user, $newPassword);
    }

    public function getUserWithPermissions(User $user): array
    {
        return [
            'id'                     => $user->id,
            'name'                   => $user->name,
            'email'                  => $user->email,
            'job_title'              => $user->job_title,
            'phone'                  => $user->phone,
            'status'                 => $user->status,
            'profile_photo_url'      => $user->profile_photo_url,
            'two_factor_enabled'     => (bool) $user->two_factor_enabled,
            'is_locked'              => $user->isLocked(),
            'locked_until'           => $user->locked_until?->toISOString(),
            'failed_login_attempts'  => (int) $user->failed_login_attempts,
            'role'                   => $user->getRole(),
            'permissions'            => $user->getPermissionsArray(),
        ];
    }

    public function unlockUser(User $user): User
    {
        $user->unlock();
        return $user;
    }

    public function sendInviteEmail(User $user): void
    {
        $frontendUrl = env('ADMIN_URL', 'http://localhost:3000');
        // Use a 24-hour token for invites (longer than a regular password reset)
        $token      = $this->authService->generateResetToken($user, 1440);
        $inviteUrl  = "{$frontendUrl}/auth/reset-password?token={$token}&email=" . urlencode($user->email) . '&invite=1';

        $this->emailService->sendUserInvite(
            $user->email,
            $user->name,
            $user->getRole(),
            $inviteUrl
        );
    }
}
