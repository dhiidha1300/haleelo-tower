<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    public function __construct(private AuditService $auditService) {}

    public function index(): JsonResponse
    {
        $settings = SystemSetting::all();

        return response()->json($settings);
    }

    public function show(string $key): JsonResponse
    {
        $setting = SystemSetting::where('key', $key)->first();

        if (!$setting) {
            return response()->json([
                'error' => 'Not Found',
                'message' => "Setting '{$key}' not found.",
            ], 404);
        }

        return response()->json($setting);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'required|string',
            'settings.*.description' => 'nullable|string',
        ]);

        try {
            foreach ($validated['settings'] as $setting) {
                SystemSetting::set(
                    $setting['key'],
                    $setting['value'],
                    $setting['description'] ?? null,
                    Auth::id()
                );

                $this->auditService->log(
                    'updated',
                    SystemSetting::class,
                    0,
                    null,
                    ['key' => $setting['key'], 'value' => $setting['value']]
                );
            }

            return response()->json([
                'message' => 'Settings updated successfully.',
                'settings' => SystemSetting::all(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function updateSingle(Request $request, string $key): JsonResponse
    {
        $request->validate([
            'value' => 'required|string',
            'description' => 'nullable|string',
        ]);

        try {
            $setting = SystemSetting::set(
                $key,
                $request->value,
                $request->description ?? null,
                Auth::id()
            );

            $this->auditService->log(
                'updated',
                SystemSetting::class,
                0,
                null,
                ['key' => $key, 'value' => $request->value]
            );

            return response()->json([
                'message' => 'Setting updated successfully.',
                'setting' => $setting,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
        ]);

        try {
            // Delete old logo if stored locally
            $oldUrl = SystemSetting::get('logo_url', '');
            if ($oldUrl && str_contains($oldUrl, '/storage/logos/')) {
                $oldPath = 'logos/' . basename($oldUrl);
                Storage::disk('public')->delete($oldPath);
            }

            $path = $request->file('logo')->store('logos', 'public');
            $url  = url('storage/' . $path);

            SystemSetting::set('logo_url', $url, 'Building logo URL', Auth::id());

            $this->auditService->log('updated', SystemSetting::class, 0, null, ['key' => 'logo_url']);

            return response()->json(['logo_url' => $url]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Upload failed: ' . $e->getMessage()], 500);
        }
    }

    // Settings by category
    public function getGeneralSettings(): JsonResponse
    {
        $keys = [
            'building_name',
            'logo_url',
            'contact_email',
            'contact_phone',
            'address',
            'timezone',
            'date_format',
        ];

        $settings = SystemSetting::whereIn('key', $keys)->get()->keyBy('key');

        return response()->json($settings);
    }

    public function getSessionSettings(): JsonResponse
    {
        $keys = [
            'session_morning_start',
            'session_morning_end',
            'session_afternoon_start',
            'session_afternoon_end',
            'session_evening_start',
            'session_evening_end',
        ];

        $settings = SystemSetting::whereIn('key', $keys)->get()->keyBy('key');

        return response()->json($settings);
    }

    public function getPaymentSettings(): JsonResponse
    {
        $keys = [
            'invoice_due_days',
            'payment_methods',
        ];

        $settings = SystemSetting::whereIn('key', $keys)->get()->keyBy('key');

        return response()->json($settings);
    }

    public function getEmailSettings(): JsonResponse
    {
        $keys = [
            'resend_from_name',
            'resend_from_email',
            'resend_reply_to',
        ];

        $settings = SystemSetting::whereIn('key', $keys)->get()->keyBy('key');

        return response()->json($settings);
    }

    public function getWhatsAppSettings(): JsonResponse
    {
        $keys = [
            'whatsapp_provider',
            'whatsapp_account_sid',
            'whatsapp_auth_token',
            'whatsapp_sender_number',
        ];

        $settings = SystemSetting::whereIn('key', $keys)->get()->keyBy('key');

        return response()->json($settings);
    }

    public function getElectricitySettings(): JsonResponse
    {
        $keys = [
            'electricity_rate_per_kwh',
        ];

        $settings = SystemSetting::whereIn('key', $keys)->get()->keyBy('key');

        return response()->json($settings);
    }

    public function getPayrollSettings(): JsonResponse
    {
        $keys = [
            'working_hours_per_day',
            'working_days_per_month',
        ];

        $settings = SystemSetting::whereIn('key', $keys)->get()->keyBy('key');

        return response()->json($settings);
    }

    public function getFiscalSettings(): JsonResponse
    {
        $keys = [
            'fiscal_year_start_month',
        ];

        $settings = SystemSetting::whereIn('key', $keys)->get()->keyBy('key');

        return response()->json($settings);
    }
}
