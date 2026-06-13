<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class FixUserRoles extends Command
{
    protected $signature   = 'roles:fix';
    protected $description = 'Reassign roles to all users based on email/job_title heuristics';

    public function handle(): int
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $users = User::withTrashed()->get();
        $this->info("Found {$users->count()} user(s). Reassigning roles...\n");

        foreach ($users as $user) {
            $role = $this->guessRole($user);

            if (!$role) {
                $this->warn("  ⚠  Skipped {$user->name} ({$user->email}) — no clear role match");
                continue;
            }

            $user->syncRoles([$role]);
            $this->line("  ✓  {$user->name} ({$user->email})  →  <fg=green>{$role}</>");
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        $this->newLine();
        $this->info('Done. Role cache cleared.');

        return Command::SUCCESS;
    }

    private function guessRole(User $user): ?string
    {
        $email    = strtolower($user->email);
        $title    = strtolower($user->job_title ?? '');

        if (str_contains($email, 'superadmin') || str_contains($title, 'system admin'))  return 'super_admin';
        if (str_contains($email, 'admin')       || str_contains($title, 'manager'))       return 'admin';
        if (str_contains($email, 'finance')     || str_contains($title, 'finance'))       return 'finance';
        if (str_contains($email, 'operations')  || str_contains($title, 'receptionist'))  return 'operations';

        // Default: first user ever created (lowest ID, likely superadmin) → super_admin
        $lowest = User::withTrashed()->orderBy('id')->value('id');
        if ($user->id === $lowest) return 'super_admin';

        return null;
    }
}
