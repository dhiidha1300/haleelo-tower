<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\CateringPackageController;
use App\Http\Controllers\Api\WhatsAppController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\EmailController;
use App\Http\Controllers\Api\ElectricityRateController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ChartOfAccountController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\JournalController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\VendorBillController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\ElectricityReadingController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\LeaseController;

Route::middleware('throttle:60,1')->group(function () {
    // Authentication routes (no auth required)
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/2fa/verify', [AuthController::class, 'verify2FA']);
    Route::post('/auth/2fa/resend', [AuthController::class, 'resendOtp']);
    Route::post('/auth/forgot-password', [PasswordResetController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [PasswordResetController::class, 'resetPassword']);
});

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/avatar', [AuthController::class, 'uploadAvatar']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // v3.1: staff notifications + global command-palette search (all authenticated staff)
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::get('/search', [\App\Http\Controllers\Api\SearchController::class, 'index']);

    // User Management — permission-gated per action (Section 4.2 of plan)
    // Read: anyone with manage-users or reset-user-password can list/view
    Route::middleware('permission:manage-users|reset-user-password')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
    });
    // Create / Edit / Deactivate / Reactivate — Super Admin only
    Route::middleware('permission:create-user')->group(function () {
        Route::post('/users', [UserController::class, 'store']);
        Route::post('/users/{user}/resend-invite', [UserController::class, 'resendInvite']);
    });
    Route::middleware('permission:edit-user')->group(function () {
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::patch('/users/{user}', [UserController::class, 'update']);
    });
    Route::middleware('permission:deactivate-user')->group(function () {
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        Route::post('/users/{user}/reactivate', [UserController::class, 'reactivate']);
    });
    // Unlock + Password reset — Super Admin and Admin
    Route::middleware('permission:unlock-user')->group(function () {
        Route::post('/users/{user}/unlock', [UserController::class, 'unlock']);
    });
    Route::middleware('permission:reset-user-password')->group(function () {
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
        Route::post('/users/{user}/send-reset-link', [PasswordResetController::class, 'sendResetLink']);
    });

    // Change own password (all authenticated users)
    Route::post('/password/change', [UserController::class, 'changePassword']);

    // WhatsApp & Email test (Super Admin only)
    Route::middleware('role:super_admin')->group(function () {
        Route::post('/whatsapp/test', [WhatsAppController::class, 'test']);
        Route::post('/email/test', [EmailController::class, 'test']);
    });

    // Catering packages (Super Admin & Admin only for write; all authenticated can read)
    Route::get('/catering-packages', [CateringPackageController::class, 'index']);
    Route::middleware('role:super_admin|admin')->group(function () {
        Route::post('/catering-packages', [CateringPackageController::class, 'store']);
        Route::put('/catering-packages/{cateringPackage}', [CateringPackageController::class, 'update']);
        Route::patch('/catering-packages/{cateringPackage}/toggle', [CateringPackageController::class, 'toggle']);
        Route::delete('/catering-packages/{cateringPackage}', [CateringPackageController::class, 'destroy']);
    });

    // Electricity rates (Super Admin & Admin only)
    Route::middleware('role:super_admin|admin')->group(function () {
        Route::get('/electricity-rates', [ElectricityRateController::class, 'index']);
        Route::post('/electricity-rates', [ElectricityRateController::class, 'store']);
    });

    // Settings
    Route::middleware('role:super_admin|admin')->group(function () {
        Route::get('/settings', [SettingsController::class, 'index']);
        Route::get('/settings/{key}', [SettingsController::class, 'show']);
        Route::put('/settings', [SettingsController::class, 'update']);
        Route::put('/settings/{key}', [SettingsController::class, 'updateSingle']);
        Route::post('/settings/logo/upload', [SettingsController::class, 'uploadLogo']);

        // Settings by category
        Route::get('/settings-category/general', [SettingsController::class, 'getGeneralSettings']);
        Route::get('/settings-category/session', [SettingsController::class, 'getSessionSettings']);
        Route::get('/settings-category/payment', [SettingsController::class, 'getPaymentSettings']);
        Route::get('/settings-category/email', [SettingsController::class, 'getEmailSettings']);
        Route::get('/settings-category/whatsapp', [SettingsController::class, 'getWhatsAppSettings']);
        Route::get('/settings-category/electricity', [SettingsController::class, 'getElectricitySettings']);
        Route::get('/settings-category/payroll', [SettingsController::class, 'getPayrollSettings']);
        Route::get('/settings-category/fiscal', [SettingsController::class, 'getFiscalSettings']);
    });

    // ─── Dashboard ──────────────────────────────────────────────────────────────
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/charts', [DashboardController::class, 'charts']);

    // ─── Phase 3d: Financial Reports ─────────────────────────────────────────────
    Route::middleware('permission:view-financial-reports')->group(function () {
        Route::get('/reports/{type}', [ReportController::class, 'data']);
    });
    Route::middleware('permission:export-financial-reports')->group(function () {
        Route::get('/reports/{type}/export', [ReportController::class, 'export']);
    });

    // ─── Phase 2: Products ──────────────────────────────────────────────────────
    Route::get('/floors', [ProductController::class, 'floors']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}', [ProductController::class, 'show']);
    Route::get('/products/{product}/services', [ProductController::class, 'getServices']);
    Route::middleware('permission:manage-products')->group(function () {
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::post('/products/{product}/toggle', [ProductController::class, 'toggle']);
        Route::post('/products/{product}/photos', [ProductController::class, 'uploadPhoto']);
        Route::delete('/products/{product}/photos', [ProductController::class, 'deletePhoto']);
        Route::put('/products/{product}/photos/reorder', [ProductController::class, 'reorderPhotos']);
        Route::post('/products/{product}/services', [ProductController::class, 'addService']);
        Route::put('/products/{product}/services/{service}', [ProductController::class, 'updateService']);
        Route::delete('/products/{product}/services/{service}', [ProductController::class, 'deleteService']);
    });

    // ─── Phase 2: Bookings ──────────────────────────────────────────────────────
    Route::middleware('permission:view-bookings')->group(function () {
        Route::get('/bookings', [BookingController::class, 'index']);
        Route::get('/bookings/calendar', [BookingController::class, 'calendar']);
        Route::get('/bookings/{booking}', [BookingController::class, 'show']);
    });
    Route::post('/bookings/availability', [BookingController::class, 'checkAvailability']);
    Route::middleware('permission:create-booking')->group(function () {
        Route::post('/bookings', [BookingController::class, 'store']);
    });
    Route::middleware('permission:approve-booking|reject-booking|cancel-booking|finance-approve-booking')->group(function () {
        Route::post('/bookings/{booking}/status', [BookingController::class, 'updateStatus']);
        Route::post('/bookings/{booking}/cancel-series', [BookingController::class, 'cancelSeries']);
    });
    Route::middleware('permission:manage-waiting-list')->group(function () {
        Route::get('/waiting-list', [BookingController::class, 'waitingList']);
        Route::post('/waiting-list', [BookingController::class, 'addToWaitingList']);
    });

    // ─── Phase 2: Tenants ───────────────────────────────────────────────────────
    Route::middleware('permission:manage-tenants|view-tenants')->group(function () {
        Route::get('/tenants', [TenantController::class, 'index']);
        Route::get('/tenants/{tenant}', [TenantController::class, 'show']);
    });
    Route::middleware('permission:manage-tenants')->group(function () {
        Route::post('/tenants', [TenantController::class, 'store']);
        Route::put('/tenants/{tenant}', [TenantController::class, 'update']);
        Route::delete('/tenants/{tenant}', [TenantController::class, 'destroy']);
    });
    Route::middleware('permission:manage-tenant-documents')->group(function () {
        Route::post('/tenants/{tenant}/documents', [TenantController::class, 'uploadDocument']);
    });
    Route::middleware('role:super_admin|admin')->group(function () {
        Route::post('/tenants/{tenant}/portal-credentials', [TenantController::class, 'generatePortalCredentials']);
    });

    // ─── Phase 2: Leases ────────────────────────────────────────────────────────
    Route::middleware('permission:manage-leases|view-leases')->group(function () {
        Route::get('/leases', [LeaseController::class, 'index']);
        Route::get('/leases/{lease}', [LeaseController::class, 'show']);
    });
    // Create a lease request — Operations, Admin, Super Admin (create-booking)
    Route::middleware('permission:create-booking')->group(function () {
        Route::post('/leases', [LeaseController::class, 'store']);
    });
    // Approve / reject / manage — Admin, Super Admin (manage-leases)
    Route::middleware('permission:manage-leases')->group(function () {
        Route::post('/leases/{lease}/approve', [LeaseController::class, 'approve']);
        Route::post('/leases/{lease}/reject', [LeaseController::class, 'reject']);
        Route::put('/leases/{lease}', [LeaseController::class, 'update']);
        Route::post('/leases/{lease}/terminate', [LeaseController::class, 'terminate']);
        Route::post('/leases/{lease}/documents', [LeaseController::class, 'uploadDocument']);
    });

    // ─── Phase 3a: Accounting Foundation ─────────────────────────────────────────
    // Chart of Accounts — view (Admin read-only, Finance, Super Admin)
    Route::middleware('permission:view-chart-of-accounts|manage-chart-of-accounts')->group(function () {
        Route::get('/chart-of-accounts', [ChartOfAccountController::class, 'index']);
    });
    // Add sub-accounts — Finance + Super Admin
    Route::middleware('permission:manage-chart-of-accounts')->group(function () {
        Route::post('/chart-of-accounts', [ChartOfAccountController::class, 'store']);
        Route::delete('/chart-of-accounts/{chartOfAccount}', [ChartOfAccountController::class, 'destroy']);
    });
    // Edit account codes — Super Admin only
    Route::middleware('permission:edit-account-codes')->group(function () {
        Route::put('/chart-of-accounts/{chartOfAccount}', [ChartOfAccountController::class, 'update']);
    });

    // Operating accounts — view balances + transactions
    Route::middleware('permission:view-accounts|manage-accounts')->group(function () {
        Route::get('/accounts', [AccountController::class, 'index']);
        Route::get('/accounts/{account}/transactions', [AccountController::class, 'transactions']);
    });
    // Inter-account transfer — Finance + Super Admin
    Route::middleware('permission:transfer-accounts')->group(function () {
        Route::post('/accounts/transfer', [AccountController::class, 'transfer']);
        Route::get('/accounts/transfer/{journalEntry}/receipt', [AccountController::class, 'transferReceipt']);
    });

    // Journal entries + trial balance
    Route::middleware('permission:view-journal-entries|create-journal-entries')->group(function () {
        Route::get('/journal', [JournalController::class, 'index']);
        Route::get('/journal/trial-balance', [JournalController::class, 'trialBalance']);
        Route::get('/journal/{journalEntry}', [JournalController::class, 'show']);
    });
    Route::middleware('permission:create-journal-entries')->group(function () {
        Route::post('/journal', [JournalController::class, 'store']);
    });

    // ─── Phase 3b: Invoices ──────────────────────────────────────────────────────
    // View — anyone with invoice access (Operations create drafts, Finance/Admin manage)
    Route::middleware('permission:manage-invoices')->group(function () {
        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::get('/invoices/{invoice}', [InvoiceController::class, 'show']);
        Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);
        Route::post('/invoices', [InvoiceController::class, 'store']);
        Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy']);
    });
    // Send invoice — Finance + Admin (send-invoice permission)
    Route::middleware('permission:send-invoice')->group(function () {
        Route::post('/invoices/{invoice}/send', [InvoiceController::class, 'send']);
    });

    // ─── Phase 3b: Payments ──────────────────────────────────────────────────────
    Route::middleware('permission:manage-payments')->group(function () {
        Route::get('/payments', [PaymentController::class, 'index']);
        Route::get('/payments/{payment}/voucher', [PaymentController::class, 'voucher']);
        Route::post('/invoices/{invoice}/payments', [PaymentController::class, 'recordForInvoice']);
        Route::post('/security-deposits/{deposit}/receive', [PaymentController::class, 'receiveDeposit']);
        Route::post('/security-deposits/{deposit}/return', [PaymentController::class, 'returnDeposit']);
    });

    // ─── Phase 3c: Vendors ───────────────────────────────────────────────────────
    Route::middleware('permission:manage-vendors')->group(function () {
        Route::get('/vendors', [VendorController::class, 'index']);
        Route::get('/vendors/{vendor}', [VendorController::class, 'show']);
        Route::post('/vendors', [VendorController::class, 'store']);
        Route::put('/vendors/{vendor}', [VendorController::class, 'update']);
        Route::delete('/vendors/{vendor}', [VendorController::class, 'destroy']);
    });

    // ─── Phase 3c: Purchase Orders ───────────────────────────────────────────────
    Route::middleware('permission:manage-purchase-orders')->group(function () {
        Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
        Route::get('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show']);
        Route::post('/purchase-orders', [PurchaseOrderController::class, 'store']);
        Route::post('/purchase-orders/{purchaseOrder}/status', [PurchaseOrderController::class, 'updateStatus']);
    });

    // ─── Phase 3c: Vendor Bills ──────────────────────────────────────────────────
    Route::middleware('permission:manage-vendor-bills')->group(function () {
        Route::get('/vendor-bills', [VendorBillController::class, 'index']);
        Route::get('/vendor-bills/{vendorBill}', [VendorBillController::class, 'show']);
        Route::post('/vendor-bills', [VendorBillController::class, 'store']);
        Route::post('/vendor-bills/{vendorBill}/pay', [VendorBillController::class, 'pay']);
    });

    // ─── Phase 3c: Expenses ──────────────────────────────────────────────────────
    Route::middleware('permission:record-expenses')->group(function () {
        Route::get('/expenses', [ExpenseController::class, 'index']);
        Route::get('/expenses/{expense}', [ExpenseController::class, 'show']);
        Route::post('/expenses', [ExpenseController::class, 'store']);
    });

    // ─── Phase 3c: Electricity Readings ──────────────────────────────────────────
    Route::middleware('permission:record-electricity-readings')->group(function () {
        Route::get('/electricity-readings', [ElectricityReadingController::class, 'index']);
        Route::post('/electricity-readings/last', [ElectricityReadingController::class, 'lastReading']);
        Route::post('/electricity-readings', [ElectricityReadingController::class, 'store']);
    });
    Route::middleware('permission:generate-electricity-invoices')->group(function () {
        Route::post('/electricity-readings/{reading}/invoice', [ElectricityReadingController::class, 'generateInvoice']);
        Route::get('/electricity-readings/{reading}/draft-invoices', [ElectricityReadingController::class, 'draftInvoices']);
        Route::post('/electricity-readings/{reading}/add-to-invoice', [ElectricityReadingController::class, 'addToInvoice']);
    });

    // ─── Phase 3e: Employees & HR ────────────────────────────────────────────────
    Route::middleware('permission:manage-employees')->group(function () {
        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::post('/employees/{employee}/contract', [EmployeeController::class, 'uploadContract']);
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
    });

    // Attendance — Admin and Finance (manage-attendance)
    Route::middleware('permission:manage-attendance')->group(function () {
        Route::get('/attendance', [AttendanceController::class, 'index']);
        Route::post('/attendance', [AttendanceController::class, 'store']);
    });

    // Leave requests — Admin and Finance (manage-leave-requests)
    Route::middleware('permission:manage-leave-requests')->group(function () {
        Route::get('/leave-requests', [LeaveRequestController::class, 'index']);
        Route::get('/leave-requests/{leaveRequest}', [LeaveRequestController::class, 'show']);
        Route::post('/leave-requests', [LeaveRequestController::class, 'store']);
        Route::post('/leave-requests/{leaveRequest}/decision', [LeaveRequestController::class, 'decision']);
    });

    // ─── Phase 3e: Payroll (Finance only) ────────────────────────────────────────
    Route::middleware('permission:manage-payroll')->group(function () {
        Route::get('/payroll/runs', [PayrollController::class, 'index']);
        Route::get('/payroll/runs/{payrollRun}', [PayrollController::class, 'show']);
        Route::post('/payroll/runs', [PayrollController::class, 'store']);
        Route::put('/payroll/payslips/{payslip}', [PayrollController::class, 'updatePayslip']);
        Route::get('/payroll/payslips/{payslip}/items', [PayrollController::class, 'payslipItems']);
        Route::post('/payroll/payslips/{payslip}/overtime', [PayrollController::class, 'addOvertime']);
        Route::delete('/payroll/payslips/{payslip}/overtime/{overtimeId}', [PayrollController::class, 'removeOvertime']);
        Route::post('/payroll/payslips/{payslip}/deductions', [PayrollController::class, 'addDeduction']);
        Route::delete('/payroll/payslips/{payslip}/deductions/{deductionId}', [PayrollController::class, 'removeDeduction']);
        Route::post('/payroll/runs/{payrollRun}/finalize', [PayrollController::class, 'finalize']);
        Route::post('/payroll/runs/{payrollRun}/void', [PayrollController::class, 'void']);
    });
    Route::middleware('permission:generate-payslips')->group(function () {
        Route::get('/payroll/payslips/{payslip}/pdf', [PayrollController::class, 'payslipPdf']);
    });

    // Audit logs (Super Admin & Admin only)
    Route::middleware('role:super_admin|admin')->group(function () {
        Route::get('/audit-logs', [AuditController::class, 'index']);
        Route::get('/audit-logs/users', [AuditController::class, 'users']);
        Route::get('/audit-logs/statistics', [AuditController::class, 'statistics']);
        Route::get('/audit-logs/export', [AuditController::class, 'export']);
        Route::get('/audit-logs/{modelType}/{modelId}', [AuditController::class, 'forModel']);
    });
});

// Health check
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now(),
    ]);
});
