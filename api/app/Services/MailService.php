<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Mail;
use Resend;

/**
 * Single entry point for sending mail. Routes through the internal SMTP server
 * (Laravel's native Symfony mailer, configured at runtime from system settings)
 * with the Resend API kept as a configurable fallback.
 */
class MailService
{
    /**
     * @param array<int,array{filename:string,content:string,mime?:string}> $attachments
     *        Attachment `content` is raw bytes (NOT base64).
     */
    public function send(string $to, string $subject, string $html, array $attachments = []): void
    {
        $driver = $this->effectiveDriver();

        if ($driver === 'smtp') {
            $this->sendViaSmtp($to, $subject, $html, $attachments);
            return;
        }

        if ($driver === 'resend') {
            $this->sendViaResend($to, $subject, $html, $attachments);
            return;
        }

        throw new \RuntimeException('No mail transport is configured. Set up SMTP or Resend in Settings → Email.');
    }

    public function fromName(): string
    {
        return SystemSetting::get('mail_from_name', SystemSetting::get('resend_from_name', 'Haleelo Tower'));
    }

    public function fromAddress(): string
    {
        return SystemSetting::get('mail_from_email', SystemSetting::get('resend_from_email', 'noreply@halelotower.so'));
    }

    public function replyTo(): ?string
    {
        return SystemSetting::get('mail_reply_to', SystemSetting::get('resend_reply_to')) ?: null;
    }

    public function smtpConfigured(): bool
    {
        return (bool) SystemSetting::get('smtp_host');
    }

    public function resendConfigured(): bool
    {
        return (bool) SystemSetting::get('resend_api_key');
    }

    /** Resolve the transport to actually use, honouring the preferred driver then falling back. */
    public function effectiveDriver(): ?string
    {
        $preferred = SystemSetting::get('mail_driver', 'smtp');

        if ($preferred === 'smtp') {
            if ($this->smtpConfigured()) return 'smtp';
            if ($this->resendConfigured()) return 'resend';
        } else { // resend
            if ($this->resendConfigured()) return 'resend';
            if ($this->smtpConfigured()) return 'smtp';
        }

        return null;
    }

    private function sendViaSmtp(string $to, string $subject, string $html, array $attachments): void
    {
        $enc    = SystemSetting::get('smtp_encryption', 'tls');
        $scheme = $enc === 'ssl' ? 'smtps' : 'smtp';

        config([
            'mail.default'      => 'smtp',
            'mail.mailers.smtp' => [
                'transport'  => 'smtp',
                'scheme'     => $scheme,
                'host'       => SystemSetting::get('smtp_host'),
                'port'       => (int) (SystemSetting::get('smtp_port', 587)),
                'encryption' => $enc === 'none' ? null : $enc,
                'username'   => SystemSetting::get('smtp_username') ?: null,
                'password'   => SystemSetting::get('smtp_password') ?: null,
                'timeout'    => 15,
            ],
            'mail.from' => ['address' => $this->fromAddress(), 'name' => $this->fromName()],
        ]);

        // Rebuild the mailer so the fresh runtime config is picked up.
        app('mail.manager')->forgetMailers();

        $replyTo = $this->replyTo();

        Mail::mailer('smtp')->html($html, function ($message) use ($to, $subject, $replyTo, $attachments) {
            $message->to($to)->subject($subject);
            if ($replyTo) {
                $message->replyTo($replyTo);
            }
            foreach ($attachments as $a) {
                $message->attachData($a['content'], $a['filename'], ['mime' => $a['mime'] ?? 'application/pdf']);
            }
        });
    }

    private function sendViaResend(string $to, string $subject, string $html, array $attachments): void
    {
        $apiKey = SystemSetting::get('resend_api_key', env('RESEND_API_KEY', ''));
        if (!$apiKey) {
            throw new \RuntimeException('Resend API key is not configured.');
        }

        $payload = [
            'from'    => $this->fromName() . ' <' . $this->fromAddress() . '>',
            'to'      => [$to],
            'subject' => $subject,
            'html'    => $html,
        ];

        if ($replyTo = $this->replyTo()) {
            $payload['reply_to'] = $replyTo;
        }

        if ($attachments) {
            $payload['attachments'] = array_map(fn ($a) => [
                'filename' => $a['filename'],
                'content'  => base64_encode($a['content']),
            ], $attachments);
        }

        Resend::client($apiKey)->emails->send($payload);
    }
}
