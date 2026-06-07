<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\AuditController;

Route::middleware('throttle:60,1')->group(function () {
    // Authentication routes (no auth required)
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/2fa/verify', [AuthController::class, 'verify2FA']);
});

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Users (Super Admin & Admin only)
    Route::middleware('role:super_admin|admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::post('/users/{user}/reactivate', [UserController::class, 'reactivate']);
        Route::post('/users/{user}/unlock', [UserController::class, 'unlock']);
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
    });

    // Change own password (all authenticated users)
    Route::post('/password/change', [UserController::class, 'changePassword']);

    // Settings
    Route::middleware('role:super_admin|admin')->group(function () {
        Route::get('/settings', [SettingsController::class, 'index']);
        Route::get('/settings/{key}', [SettingsController::class, 'show']);
        Route::put('/settings', [SettingsController::class, 'update']);
        Route::put('/settings/{key}', [SettingsController::class, 'updateSingle']);

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

    // Audit logs (Super Admin & Admin only)
    Route::middleware('role:super_admin|admin')->group(function () {
        Route::get('/audit-logs', [AuditController::class, 'index']);
        Route::get('/audit-logs/{modelType}/{modelId}', [AuditController::class, 'forModel']);
        Route::post('/audit-logs/export', [AuditController::class, 'export']);
        Route::get('/audit-logs/statistics', [AuditController::class, 'statistics']);
    });
});

// Health check
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now(),
    ]);
});
