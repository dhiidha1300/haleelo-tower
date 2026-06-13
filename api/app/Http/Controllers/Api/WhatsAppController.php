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
            match ($provider) {
                'twilio'     => $this->sendTwilio($sid, $token, $from, $phone),
                '360dialog'  => $this->send360Dialog($sid, $token, $from, $phone),
                'cloud_api'  => $this->sendCloudApi($sid, $token, $phone),
                default      => throw new \Exception("Unknown provider: {$provider}"),
            };

            return response()->json(['message' => 'Test message sent successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send: ' . $e->getMessage()], 422);
        }
    }

    private function sendTwilio(string $sid, string $token, string $from, string $phone): void
    {
        if (!$sid || !$token || !$from) {
            throw new \Exception('Twilio credentials (Account SID, Auth Token, Sender Number) are not fully configured.');
        }

        $client = new \Twilio\Rest\Client($sid, $token);
        $client->messages->create('whatsapp:+' . $phone, [
            'from' => str_starts_with($from, 'whatsapp:') ? $from : 'whatsapp:' . $from,
            'body' => 'This is a test message from Haleelo Tower. WhatsApp API is configured correctly.',
        ]);
    }

    private function send360Dialog(string $apiKey, string $apiSecret, string $from, string $phone): void
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
    }

    private function sendCloudApi(string $phoneNumberId, string $accessToken, string $phone): void
    {
        if (!$phoneNumberId || !$accessToken) {
            throw new \Exception('WhatsApp Cloud API credentials (Phone Number ID, Access Token) are not fully configured.');
        }

        $response = Http::withToken($accessToken)
            ->post("https://graph.facebook.com/v19.0/{$phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to'                => $phone,
                'type'              => 'text',
                'text'              => ['body' => 'This is a test message from Haleelo Tower. WhatsApp API is configured correctly.'],
            ]);

        if ($response->failed()) {
            $error = $response->json('error.message') ?? 'Request failed with status ' . $response->status();
            throw new \Exception($error);
        }
    }
}
