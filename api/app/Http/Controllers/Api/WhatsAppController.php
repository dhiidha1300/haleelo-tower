<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WhatsAppController extends Controller
{
    public function test(Request $request): JsonResponse
    {
        $request->validate(['phone' => 'required|string']);

        $provider = SystemSetting::get('whatsapp_provider', 'twilio');
        $sid      = SystemSetting::get('whatsapp_account_sid', '');
        $token    = SystemSetting::get('whatsapp_auth_token', '');
        $from     = SystemSetting::get('whatsapp_sender_number', '');

        $phone = preg_replace('/\D/', '', $request->phone); // strip non-digits

        try {
            $note = match ($provider) {
                'twilio'     => $this->sendTwilio($sid, $token, $from, $phone),
                '360dialog'  => $this->send360Dialog($sid, $token, $from, $phone),
                'cloud_api'  => $this->sendCloudApi($sid, $token, $phone),
                default      => throw new \Exception("Unknown provider: {$provider}"),
            };

            return response()->json(['message' => $note ?: 'Test message sent successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send: ' . $e->getMessage()], 422);
        }
    }

    private function sendTwilio(string $sid, string $token, string $from, string $phone): ?string
    {
        if (!$sid || !$token || !$from) {
            throw new \Exception('Twilio credentials (Account SID, Auth Token, Sender Number) are not fully configured.');
        }

        $client = new \Twilio\Rest\Client($sid, $token);
        $client->messages->create('whatsapp:+' . $phone, [
            'from' => str_starts_with($from, 'whatsapp:') ? $from : 'whatsapp:' . $from,
            'body' => 'This is a test message from Haleelo Tower. WhatsApp API is configured correctly.',
        ]);
        return null;
    }

    private function send360Dialog(string $apiKey, string $apiSecret, string $from, string $phone): ?string
    {
        if (!$apiKey || !$from) {
            throw new \Exception('360dialog credentials (API Key, Sender Number) are not fully configured.');
        }

        $response = Http::withHeaders([
            'D360-API-KEY' => $apiKey,
            'Content-Type' => 'application/json',
        ])->post('https://waba.360dialog.io/v1/messages', [
            'to'   => $phone,
            'type' => 'text',
            'text' => ['body' => 'This is a test message from Haleelo Tower. WhatsApp API is configured correctly.'],
        ]);

        if ($response->failed()) {
            throw new \Exception($response->json('message') ?? 'Request failed with status ' . $response->status());
        }
        return null;
    }

    private function sendCloudApi(string $phoneNumberId, string $accessToken, string $phone): ?string
    {
        if (!$phoneNumberId || !$accessToken) {
            throw new \Exception('WhatsApp Cloud API credentials (Phone Number ID, Access Token) are not fully configured.');
        }
        $base = "https://graph.facebook.com/v19.0/{$phoneNumberId}";

        // 1) Verify the credentials by reading the phone-number node. Success here
        //    proves the Phone Number ID is correct AND the token can access it.
        $check = Http::withToken($accessToken)->get($base, ['fields' => 'display_phone_number,verified_name']);
        if ($check->failed()) {
            $err = $check->json('error') ?? [];
            $code = $err['code'] ?? $check->status();
            $msg = $err['message'] ?? ('Request failed with status ' . $check->status());
            if ($code === 190) {
                throw new \Exception($msg . ' — The access token is invalid or expired. Generate a fresh, permanent System User token with the whatsapp_business_messaging permission. [Meta code 190]');
            }
            throw new \Exception($msg . " — The Phone Number ID may be wrong, or your token's system user can't access this number's WhatsApp Business Account. "
                . "Copy the Phone Number ID from WhatsApp → API Setup (NOT the phone number, the WABA ID, or the App ID), and add the system user to that WABA with the whatsapp_business_messaging permission. [Meta code {$code}]");
        }
        $numberLabel = $check->json('display_phone_number') ?: 'your business number';

        // 2) Try to deliver the sample hello_world template.
        $send = Http::withToken($accessToken)->post("{$base}/messages", [
            'messaging_product' => 'whatsapp',
            'to'                => $phone,
            'type'              => 'template',
            'template'          => ['name' => 'hello_world', 'language' => ['code' => 'en_US']],
        ]);

        if ($send->successful()) {
            return "✓ Connected to {$numberLabel}. A 'hello_world' test message was sent to +{$phone}.";
        }

        $err  = $send->json('error') ?? [];
        $code = $err['code'] ?? $send->status();
        $msg  = $err['message'] ?? ('Request failed with status ' . $send->status());

        // Credentials are valid (step 1 passed) — give precise, non-alarming guidance.
        if ($code === 132001) {
            return "✓ Connection verified to {$numberLabel} — your Phone Number ID and token work. "
                . "No test message was delivered because the 'hello_world' template isn't on this WhatsApp Business Account. "
                . 'Add the hello_world sample template in Meta, or send via one of your approved templates for live messages.';
        }
        if (in_array($code, [131030], true) || str_contains((string) $msg, 'allowed list')) {
            throw new \Exception("Connection works, but +{$phone} isn't in your allowed recipient list. While the app is in development/review, add it under WhatsApp → API Setup → recipient phone numbers. [Meta code {$code}]");
        }
        throw new \Exception($msg . " [Meta code {$code}]");
    }
}
