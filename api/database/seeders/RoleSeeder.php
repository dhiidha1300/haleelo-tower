<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Reset only the permission cache — never delete roles or permissions,
        // as that cascades to model_has_roles and strips all user role assignments.
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

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
            'view-bookings',
            'create-booking',
            'approve-booking',
            'finance-approve-booking',
            'reject-booking',
            'cancel-booking',
            'manage-waiting-list',

            // Tenants (Phase 2)
            'view-tenants',
            'manage-tenants',
            'view-leases',
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
            'view-accounts',
            'transfer-accounts',
            'manage-chart-of-accounts',
            'view-chart-of-accounts',
            'edit-account-codes',
            'create-journal-entries',
            'view-journal-entries',
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
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Create roles (idempotent — does not delete existing role-user assignments)
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $adminRole      = Role::firstOrCreate(['name' => 'admin',       'guard_name' => 'web']);
        $operationsRole = Role::firstOrCreate(['name' => 'operations',  'guard_name' => 'web']);
        $financeRole    = Role::firstOrCreate(['name' => 'finance',     'guard_name' => 'web']);

        // Super Admin - Full access
        $superAdminRole->syncPermissions(Permission::all());

        // Admin - Limited access (per Section 4.2 permissions matrix)
        $adminRole->syncPermissions([
            // Settings — session times, payment terms, electricity, working hours, catering
            // NOT: manage-settings, manage-email-settings, manage-whatsapp-settings (Super Admin only)
            'view-settings',

            // User management — password reset and unlock only; NOT create/edit/deactivate
            'reset-user-password',
            'unlock-user',

            // Audit
            'view-audit-logs',
            'export-audit-logs',

            // Products & catering
            'view-products',
            'manage-products',
            'manage-catering-packages',

            // Bookings
            'view-bookings',
            'create-booking',
            'approve-booking',
            'reject-booking',
            'cancel-booking',
            'manage-waiting-list',

            // Tenants
            'view-tenants',
            'manage-tenants',
            'view-leases',
            'manage-leases',
            'manage-tenant-documents',

            // Finance (read / create invoices, not full financial ops)
            'manage-invoices',
            'send-invoice',
            'view-financial-reports',

            // Accounting — read-only (per Section 4.2 matrix: Admin = R)
            'view-chart-of-accounts',
            'view-journal-entries',
            'view-accounts',

            // Electricity
            'record-electricity-readings',

            // HR
            'manage-attendance',
            'manage-leave-requests',

            // Maintenance & communications
            'manage-maintenance',
            'view-maintenance',
            'broadcast-announcements',
            'view-announcements',
        ]);

        // Operations - Limited access
        $operationsRole->syncPermissions([
            'view-products',
            'view-bookings',
            'create-booking',
            'manage-waiting-list',
            'view-tenants',
            'manage-tenants',
            'manage-tenant-documents',
            'view-leases',
            'manage-invoices',
            'view-maintenance',
            'view-announcements',
        ]);

        // Finance - Financial operations
        $financeRole->syncPermissions([
            'view-settings',
            'view-products',
            'view-bookings',
            'finance-approve-booking',
            'approve-booking',
            'reject-booking',
            'cancel-booking',
            'view-tenants',
            'view-leases',
            'manage-invoices',
            'send-invoice',
            'manage-payments',
            'manage-vendors',
            'manage-purchase-orders',
            'manage-vendor-bills',
            'record-expenses',
            'manage-accounts',
            'view-accounts',
            'transfer-accounts',
            'manage-chart-of-accounts',
            'view-chart-of-accounts',
            'create-journal-entries',
            'view-journal-entries',
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
