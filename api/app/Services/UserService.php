<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserService
{
    public function __construct(
        private AuthenticationService $authService,
        private AuditService $auditService
    ) {}

    public function createUser(array $data): User
    {
        $user = User::create([
            'name' => $data['name'],
            'job_title' => $data['job_title'] ?? null,
            'email' => $data['email'],
            'password' => $this->authService->hashPassword($data['password'] ?? $this->authService->generateTemporaryPassword()),
            'phone' => $data['phone'] ?? null,
            'status' => $data['status'] ?? 'active',
        ]);

        if (!empty($data['role'])) {
            $user->assignRole($data['role']);
        }

        $this->auditService->log('created', User::class, $user->id, null, $user->toArray());

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
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'job_title' => $user->job_title,
            'phone' => $user->phone,
            'status' => $user->status,
            'profile_photo_url' => $user->profile_photo_url,
            'role' => $user->getRole(),
            'permissions' => $user->getPermissionsArray(),
        ];
    }

    public function unlockUser(User $user): User
    {
        $user->unlock();
        return $user;
    }
}
