<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    private string $provider;
    private string $sid;
    private string $token;
    private string $from;

    public function __construct()
    {
        $this->provider = SystemSetting::get('whatsapp_provider', env('WHATSAPP_PROVIDER', 'twilio'));
        $this->sid      = SystemSetting::get('whatsapp_account_sid', env('WHATSAPP_ACCOUNT_SID', ''));
        $this->token    = SystemSetting::get('whatsapp_auth_token', env('WHATSAPP_AUTH_TOKEN', ''));
        $this->from     = SystemSetting::get('whatsapp_sender_number', env('WHATSAPP_SENDER_NUMBER', ''));
    }

    public function isConfigured(): bool
    {
        return match ($this->provider) {
            'cloud_api' => !empty($this->sid) && !empty($this->token),
            default     => !empty($this->sid) && !empty($this->token) && !empty($this->from),
        };
    }

    public function send(string $toPhone, string $message): void
    {
        if (!$this->isConfigured()) {
            Log::warning('WhatsApp not configured — message not sent', ['to' => $toPhone]);
            return;
        }

        $phone = preg_replace('/\D/', '', $toPhone);

        match ($this->provider) {
            'twilio'    => $this->sendTwilio($phone, $message),
            '360dialog' => $this->send360Dialog($phone, $message),
            'cloud_api' => $this->sendCloudApi($phone, $message),
            default     => Log::warning("Unknown WhatsApp provider: {$this->provider}"),
        };
    }

    public function sendOtp(string $toPhone, string $otp): void
    {
        $this->send($toPhone, "Your Haleelo Tower verification code is: *{$otp}*\n\nThis code expires in 5 minutes. Do not share it with anyone.");
    }

    private function sendTwilio(string $phone, string $message): void
    {
        $client = new \Twilio\Rest\Client($this->sid, $this->token);
        $from   = str_starts_with($this->from, 'whatsapp:') ? $this->from : 'whatsapp:' . $this->from;
        $client->messages->create('whatsapp:+' . $phone, ['from' => $from, 'body' => $message]);
    }

    private function send360Dialog(string $phone, string $message): void
    {
        $response = Http::withHeaders([
            'D360-API-KEY' => $this->sid,
            'Content-Type' => 'application/json',
        ])->post('https://waba.360dialog.io/v1/messages', [
            'to'   => $phone,
            'type' => 'text',
            'text' => ['body' => $message],
        ]);

        if ($response->failed()) {
            throw new \Exception('360dialog send failed: ' . ($response->json('message') ?? $response->status()));
        }
    }

    private function sendCloudApi(string $phone, string $message): void
    {
        $response = Http::withToken($this->token)
            ->post("https://graph.facebook.com/v19.0/{$this->sid}/messages", [
                'messaging_product' => 'whatsapp',
                'to'                => $phone,
                'type'              => 'text',
                'text'              => ['body' => $message],
            ]);

        if ($response->failed()) {
            $error = $response->json('error.message') ?? $response->status();
            throw new \Exception("Cloud API send failed: {$error}");
        }
    }
}
