<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Delete existing test users if they exist
        User::where('email', 'admin@halelotower.so')->forceDelete();
        User::where('email', 'superadmin@halelotower.so')->forceDelete();

        // Create Super Admin user
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@halelotower.so',
            'password' => 'SuperAdmin123!', // Will be hashed by model cast
            'phone' => '+252612345678',
            'job_title' => 'System Administrator',
            'status' => 'active',
        ]);
        $superAdmin->assignRole('super_admin');

        // Create Admin user
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@halelotower.so',
            'password' => 'AdminPass123!', // Will be hashed by model cast
            'phone' => '+252612345679',
            'job_title' => 'Building Manager',
            'status' => 'active',
        ]);
        $admin->assignRole('admin');

        // Create Operations user
        $operations = User::create([
            'name' => 'Operations User',
            'email' => 'operations@halelotower.so',
            'password' => 'OperPass123!',
            'phone' => '+252612345680',
            'job_title' => 'Receptionist',
            'status' => 'active',
        ]);
        $operations->assignRole('operations');

        // Create Finance user
        $finance = User::create([
            'name' => 'Finance User',
            'email' => 'finance@halelotower.so',
            'password' => 'FinancePass123!',
            'phone' => '+252612345681',
            'job_title' => 'Finance Officer',
            'status' => 'active',
        ]);
        $finance->assignRole('finance');

        echo "Users seeded successfully!\n";
        echo "Test Credentials:\n";
        echo "  Super Admin: superadmin@halelotower.so / SuperAdmin123!\n";
        echo "  Admin: admin@halelotower.so / AdminPass123!\n";
        echo "  Operations: operations@halelotower.so / OperPass123!\n";
        echo "  Finance: finance@halelotower.so / FinancePass123!\n";
    }
}
