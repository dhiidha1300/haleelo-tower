<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing roles and permissions
        Role::query()->delete();
        Permission::query()->delete();

        // Create permissions
        $permissions = [
            // User Management
            'manage-users',
            'create-user',
            'edit-user',
            'deactivate-user',
            'reset-user-password',
            'unlock-user',

            // Settings
            'manage-settings',
            'view-settings',
            'manage-email-settings',
            'manage-whatsapp-settings',

            // Audit
            'view-audit-logs',
            'export-audit-logs',

            // Products (Phase 2)
            'manage-products',
            'view-products',
            'manage-catering-packages',

            // Bookings (Phase 2)
            'create-booking',
            'approve-booking',
            'reject-booking',
            'cancel-booking',
            'manage-waiting-list',

            // Tenants (Phase 2)
            'manage-tenants',
            'manage-leases',
            'manage-tenant-documents',

            // Finance (Phase 3)
            'manage-invoices',
            'send-invoice',
            'manage-payments',
            'manage-vendors',
            'manage-purchase-orders',
            'manage-vendor-bills',
            'record-expenses',
            'manage-accounts',
            'transfer-accounts',
            'manage-chart-of-accounts',
            'create-journal-entries',
            'view-financial-reports',
            'export-financial-reports',

            // Electricity (Phase 3)
            'record-electricity-readings',
            'generate-electricity-invoices',

            // Payroll (Phase 3)
            'manage-employees',
            'manage-attendance',
            'manage-leave-requests',
            'manage-payroll',
            'generate-payslips',

            // HR (Phase 3)
            'manage-hr',

            // Maintenance (Phase 5)
            'manage-maintenance',
            'view-maintenance',

            // Communications (Phase 5)
            'broadcast-announcements',
            'view-announcements',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission, 'guard_name' => 'web']);
        }

        // Create roles
        $superAdminRole = Role::create(['name' => 'super_admin', 'guard_name' => 'web']);
        $adminRole = Role::create(['name' => 'admin', 'guard_name' => 'web']);
        $operationsRole = Role::create(['name' => 'operations', 'guard_name' => 'web']);
        $financeRole = Role::create(['name' => 'finance', 'guard_name' => 'web']);

        // Super Admin - Full access
        $superAdminRole->syncPermissions(Permission::all());

        // Admin - Limited access
        $adminRole->syncPermissions([
            'view-settings',
            'manage-email-settings',
            'view-products',
            'manage-products',
            'manage-catering-packages',
            'create-booking',
            'approve-booking',
            'reject-booking',
            'cancel-booking',
            'manage-waiting-list',
            'manage-tenants',
            'manage-leases',
            'manage-tenant-documents',
            'view-audit-logs',
            'manage-invoices',
            'send-invoice',
            'view-financial-reports',
            'record-electricity-readings',
            'manage-attendance',
            'manage-leave-requests',
            'manage-maintenance',
            'view-maintenance',
            'broadcast-announcements',
            'view-announcements',
        ]);

        // Operations - Limited access
        $operationsRole->syncPermissions([
            'view-products',
            'create-booking',
            'manage-waiting-list',
            'manage-tenants',
            'manage-tenant-documents',
            'manage-invoices',
            'view-maintenance',
            'view-announcements',
        ]);

        // Finance - Financial operations
        $financeRole->syncPermissions([
            'view-settings',
            'view-products',
            'approve-booking',
            'reject-booking',
            'cancel-booking',
            'manage-invoices',
            'send-invoice',
            'manage-payments',
            'manage-vendors',
            'manage-purchase-orders',
            'manage-vendor-bills',
            'record-expenses',
            'manage-accounts',
            'transfer-accounts',
            'manage-chart-of-accounts',
            'create-journal-entries',
            'view-financial-reports',
            'export-financial-reports',
            'record-electricity-readings',
            'generate-electricity-invoices',
            'manage-employees',
            'manage-attendance',
            'manage-leave-requests',
            'manage-payroll',
            'generate-payslips',
        ]);
    }
}
