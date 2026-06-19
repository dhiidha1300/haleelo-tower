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

    /** Send a document (PDF) by URL with a caption. No-ops gracefully if unconfigured. */
    public function sendDocument(string $toPhone, string $caption, string $mediaUrl): bool
    {
        if (!$this->isConfigured()) {
            Log::warning('WhatsApp not configured — document not sent', ['to' => $toPhone]);
            return false;
        }

        $phone = preg_replace('/\D/', '', $toPhone);

        match ($this->provider) {
            'twilio' => (function () use ($phone, $caption, $mediaUrl) {
                $client = new \Twilio\Rest\Client($this->sid, $this->token);
                $from   = str_starts_with($this->from, 'whatsapp:') ? $this->from : 'whatsapp:' . $this->from;
                $client->messages->create('whatsapp:+' . $phone, ['from' => $from, 'body' => $caption, 'mediaUrl' => [$mediaUrl]]);
            })(),
            'cloud_api' => (function () use ($phone, $caption, $mediaUrl) {
                $r = Http::withToken($this->token)->post("https://graph.facebook.com/v19.0/{$this->sid}/messages", [
                    'messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'document',
                    'document' => ['link' => $mediaUrl, 'caption' => $caption],
                ]);
                if ($r->failed()) throw new \Exception('Cloud API document send failed: ' . ($r->json('error.message') ?? $r->status()));
            })(),
            '360dialog' => (function () use ($phone, $caption, $mediaUrl) {
                $r = Http::withHeaders(['D360-API-KEY' => $this->sid, 'Content-Type' => 'application/json'])
                    ->post('https://waba.360dialog.io/v1/messages', [
                        'to' => $phone, 'type' => 'document', 'document' => ['link' => $mediaUrl, 'caption' => $caption],
                    ]);
                if ($r->failed()) throw new \Exception('360dialog document send failed');
            })(),
            default => Log::warning("Unknown WhatsApp provider: {$this->provider}"),
        };

        return true;
    }

    /**
     * Send a Meta-approved template message (the correct way to start a
     * business-initiated conversation outside the 24-hour window).
     * $bodyParams fill {{1}},{{2}}… in order; $documentUrl attaches a PDF to a
     * Document header. No-ops gracefully if unconfigured.
     */
    public function sendTemplate(string $toPhone, string $template, array $bodyParams = [], ?string $documentUrl = null, ?string $documentFilename = null): bool
    {
        if (!$this->isConfigured()) {
            Log::warning('WhatsApp not configured — template not sent', ['to' => $toPhone, 'template' => $template]);
            return false;
        }

        $phone = preg_replace('/\D/', '', $toPhone);
        $lang  = SystemSetting::get('whatsapp_template_lang', 'en_US');

        if ($this->provider === 'cloud_api') {
            $components = [];
            if ($documentUrl) {
                $components[] = ['type' => 'header', 'parameters' => [[
                    'type' => 'document',
                    'document' => array_filter(['link' => $documentUrl, 'filename' => $documentFilename]),
                ]]];
            }
            if (!empty($bodyParams)) {
                $components[] = ['type' => 'body', 'parameters' => array_map(fn ($t) => ['type' => 'text', 'text' => (string) $t], array_values($bodyParams))];
            }

            $tpl = ['name' => $template, 'language' => ['code' => $lang]];
            if ($components) $tpl['components'] = $components;

            $r = Http::withToken($this->token)->post("https://graph.facebook.com/v19.0/{$this->sid}/messages", [
                'messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'template', 'template' => $tpl,
            ]);
            if ($r->failed()) {
                throw new \Exception('WhatsApp template send failed: ' . ($r->json('error.message') ?? ('status ' . $r->status())));
            }
            return true;
        }

        // Twilio / 360dialog fallback: send the PDF (or text) with a composed caption.
        $caption = implode(' ', $bodyParams);
        if ($documentUrl) {
            return $this->sendDocument($toPhone, $caption, $documentUrl);
        }
        $this->send($toPhone, $caption);
        return true;
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
