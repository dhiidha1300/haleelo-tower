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
        // SystemSetting::all() returns a cached key => value array.
        $settings = SystemSetting::all();

        // logo_url is stored as an object key — expose a usable (signed) URL.
        if (!empty($settings['logo_url'])) {
            $settings['logo_url'] = \App\Support\FileStorage::url($settings['logo_url']);
        }

        return response()->json($this->redactSecrets($settings));
    }

    /** Replace secret values with a configured flag so they never reach the browser. */
    private function redactSecrets(array $settings): array
    {
        foreach (SystemSetting::ENCRYPTED_KEYS as $key) {
            if (array_key_exists($key, $settings)) {
                $settings[$key . '_set'] = (bool) ($settings[$key] ?? false);
                $settings[$key] = '';
            }
        }
        return $settings;
    }

    /** Public branding info for favicons / page titles (no auth required). */
    public function branding(): JsonResponse
    {
        return response()->json([
            'building_name' => SystemSetting::get('building_name', 'Haleelo Tower'),
            'logo_url'      => \App\Support\FileStorage::url(SystemSetting::get('logo_url', '')),
            'address'       => SystemSetting::get('address', ''),
        ]);
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

        if ($setting->key === 'logo_url' && $setting->value) {
            $setting->value = \App\Support\FileStorage::url($setting->value);
        }

        return response()->json($setting);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'present|nullable|string', // allow blank values
            'settings.*.description' => 'nullable|string',
        ]);

        try {
            foreach ($validated['settings'] as $setting) {
                // For secret keys, a blank submission means "leave unchanged".
                if (SystemSetting::isEncryptedKey($setting['key']) && ($setting['value'] ?? '') === '') {
                    continue;
                }

                SystemSetting::set(
                    $setting['key'],
                    $setting['value'] ?? '',
                    $setting['description'] ?? null,
                    Auth::id()
                );

                $this->auditService->log(
                    'updated',
                    SystemSetting::class,
                    0,
                    null,
                    // Never write secret values into the audit log.
                    ['key' => $setting['key'], 'value' => SystemSetting::isEncryptedKey($setting['key']) ? '••••••' : $setting['value']]
                );
            }

            return response()->json([
                'message' => 'Settings updated successfully.',
                'settings' => $this->redactSecrets(SystemSetting::all()),
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
            // Settings can legitimately be blank (e.g. sender number is unused for
            // the Cloud API provider) — accept empty strings, just require the field present.
            'value' => 'present|nullable|string',
            'description' => 'nullable|string',
        ]);

        try {
            // Blank value for a secret key means "leave unchanged".
            if (SystemSetting::isEncryptedKey($key) && ($request->input('value') ?? '') === '') {
                return response()->json(['message' => 'Setting unchanged.']);
            }

            $setting = SystemSetting::set(
                $key,
                $request->input('value') ?? '',
                $request->description ?? null,
                Auth::id()
            );

            $this->auditService->log(
                'updated',
                SystemSetting::class,
                0,
                null,
                ['key' => $key, 'value' => SystemSetting::isEncryptedKey($key) ? '••••••' : $request->value]
            );

            // Never echo a secret value back to the client.
            if (SystemSetting::isEncryptedKey($key)) {
                return response()->json(['message' => 'Setting updated successfully.']);
            }

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
            // Delete the previous logo (handles both legacy local paths and S3 keys)
            \App\Support\FileStorage::delete(SystemSetting::get('logo_url', ''));

            // Store the object key; the signed URL is produced on read.
            $path = \App\Support\FileStorage::put($request->file('logo'), 'logos');

            SystemSetting::set('logo_url', $path, 'Building logo URL', Auth::id());

            $this->auditService->log('updated', SystemSetting::class, 0, null, ['key' => 'logo_url']);

            return response()->json(['logo_url' => \App\Support\FileStorage::url($path)]);
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

        // Resolve the stored logo key into a usable (signed for S3) URL.
        if (isset($settings['logo_url']) && $settings['logo_url']->value) {
            $settings['logo_url']->value = \App\Support\FileStorage::url($settings['logo_url']->value);
        }

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
            'mail_driver',
            'smtp_host', 'smtp_port', 'smtp_encryption', 'smtp_username',
            'mail_from_name', 'mail_from_email', 'mail_reply_to',
            // legacy / fallback
            'resend_from_name', 'resend_from_email', 'resend_reply_to',
        ];

        $settings = SystemSetting::whereIn('key', $keys)->get()->keyBy('key');

        // Never expose secrets — surface only whether they are configured.
        $settings = $settings->toArray();
        $settings['smtp_password_set'] = (bool) (SystemSetting::get('smtp_password') ?: false);
        $settings['resend_api_key_set'] = (bool) (SystemSetting::get('resend_api_key') ?: false);

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
