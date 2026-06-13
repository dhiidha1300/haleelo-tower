<?php

namespace App\Services;

use App\Models\SystemSetting;
use Resend;

class EmailService
{
    private function fromAddress(): string
    {
        return SystemSetting::get('resend_from_email', config('mail.from.address', 'noreply@halelotower.so'));
    }

    private function fromName(): string
    {
        return SystemSetting::get('resend_from_name', 'Haleelo Tower');
    }

    public function sendPasswordReset(string $toEmail, string $toName, string $resetUrl): void
    {
        $from     = $this->fromName() . ' <' . $this->fromAddress() . '>';
        $expiry   = '60 minutes';

        $apiKey = SystemSetting::get('resend_api_key', env('RESEND_API_KEY', ''));
        if (!$apiKey) {
            throw new \Exception('Resend API key is not configured. Set it in Settings → Email.');
        }
        $client = Resend::client($apiKey);
        $client->emails->send([
            'from'    => $from,
            'to'      => [$toEmail],
            'subject' => 'Reset Your Haleelo Tower Password',
            'html'    => $this->passwordResetHtml($toName, $resetUrl, $expiry),
        ]);
    }

    public function sendInvoice(\App\Models\Invoice $invoice): void
    {
        $apiKey = SystemSetting::get('resend_api_key', env('RESEND_API_KEY', ''));
        if (!$apiKey || !$invoice->bill_to_email) return;

        $client = Resend::client($apiKey);
        $from   = $this->fromName() . ' <' . $this->fromAddress() . '>';
        $pdf    = app(\App\Services\InvoiceService::class)->generatePdf($invoice);
        $amount = number_format((float) $invoice->total_amount, 2);

        $client->emails->send([
            'from'    => $from,
            'to'      => [$invoice->bill_to_email],
            'subject' => "Invoice {$invoice->invoice_code} — \${$amount}",
            'html'    => "<p>Dear {$invoice->billToName()},</p><p>Please find attached invoice <strong>{$invoice->invoice_code}</strong> for <strong>\${$amount}</strong>, due on {$invoice->due_date->format('d M Y')}.</p><p>Pay via Edahab, ZAAD, or bank transfer quoting your invoice code.</p>",
            'attachments' => [[
                'filename' => "{$invoice->invoice_code}.pdf",
                'content'  => base64_encode($pdf),
            ]],
        ]);
    }

    public function sendPayslip(\App\Models\Payslip $slip): void
    {
        $apiKey = SystemSetting::get('resend_api_key', env('RESEND_API_KEY', ''));
        $emp = $slip->employee;
        if (!$apiKey || !$emp?->email) return;

        $client = Resend::client($apiKey);
        $from   = $this->fromName() . ' <' . $this->fromAddress() . '>';
        $net    = number_format((float) $slip->net_pay, 2);
        $month  = $slip->payrollRun?->month;

        $payload = [
            'from'    => $from,
            'to'      => [$emp->email],
            'subject' => "Payslip {$slip->payslip_code} — {$month}",
            'html'    => "<p>Dear {$emp->full_name},</p><p>Your payslip for <strong>{$month}</strong> is attached. Net pay: <strong>\${$net}</strong>.</p>",
        ];

        // Attach the stored PDF if available
        if ($slip->pdf_file_url) {
            try {
                $pdf = app(\App\Services\PayrollService::class)->generatePayslipPdf($slip);
                $payload['attachments'] = [['filename' => "{$slip->payslip_code}.pdf", 'content' => base64_encode($pdf)]];
            } catch (\Exception $e) { /* send without attachment */ }
        }

        $client->emails->send($payload);
    }

    public function sendBookingNotification(\App\Models\Booking $booking, string $eventType, string $message): void
    {
        $apiKey = SystemSetting::get('resend_api_key', env('RESEND_API_KEY', ''));
        if (!$apiKey || !$booking->client_email) return;

        $client = Resend::client($apiKey);
        $from   = $this->fromName() . ' <' . $this->fromAddress() . '>';

        $subjects = [
            'acknowledged' => "Booking Request Received — {$booking->booking_code}",
            'approved'     => "Booking Confirmed — {$booking->booking_code}",
            'rejected'     => "Booking Not Approved — {$booking->booking_code}",
            'cancelled'    => "Booking Cancelled — {$booking->booking_code}",
        ];

        $client->emails->send([
            'from'    => $from,
            'to'      => [$booking->client_email],
            'subject' => $subjects[$eventType] ?? "Booking Update — {$booking->booking_code}",
            'html'    => "<p>Dear {$booking->client_name},</p><p>{$message}</p><p>Reference: <strong>{$booking->booking_code}</strong></p>",
        ]);
    }

    public function sendLeaseRenewalReminder(\App\Models\Lease $lease): void
    {
        $apiKey = SystemSetting::get('resend_api_key', env('RESEND_API_KEY', ''));
        if (!$apiKey || !$lease->tenant?->email) return;

        $client  = Resend::client($apiKey);
        $from    = $this->fromName() . ' <' . $this->fromAddress() . '>';
        $tenant  = $lease->tenant;
        $space   = $lease->space?->name ?? 'your space';
        $endDate = $lease->end_date?->format('d M Y');

        $client->emails->send([
            'from'    => $from,
            'to'      => [$tenant->email],
            'subject' => "Lease Renewal Reminder — {$space}",
            'html'    => "<p>Dear {$tenant->contact_person_name},</p><p>Your lease for <strong>{$space}</strong> expires on <strong>{$endDate}</strong>. Please contact us to discuss renewal options.</p>",
        ]);
    }

    public function sendUserInvite(string $toEmail, string $toName, string $role, string $setPasswordUrl): void
    {
        $apiKey = SystemSetting::get('resend_api_key', env('RESEND_API_KEY', ''));
        if (!$apiKey) {
            throw new \Exception('Resend API key is not configured. Set it in Settings → Email.');
        }

        $from = $this->fromName() . ' <' . $this->fromAddress() . '>';

        $client = Resend::client($apiKey);
        $client->emails->send([
            'from'    => $from,
            'to'      => [$toEmail],
            'subject' => 'You have been invited to Haleelo Tower Admin',
            'html'    => $this->userInviteHtml($toName, $toEmail, $role, $setPasswordUrl),
        ]);
    }

    private function userInviteHtml(string $name, string $email, string $role, string $setPasswordUrl): string
    {
        $roleLabel = ucfirst(str_replace('_', ' ', $role));
        return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <tr>
          <td style="background:#1B2D4F;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#C9A052;font-size:28px;font-weight:700;">Haleelo Tower</h1>
            <p style="margin:4px 0 0;color:#ffffff;opacity:0.8;font-size:13px;">Admin Dashboard</p>
          </td>
        </tr>

        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#1B2D4F;font-size:22px;">Welcome to Haleelo Tower!</h2>
            <p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">Hi {$name},</p>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
              You have been invited to join the Haleelo Tower admin platform as <strong>{$roleLabel}</strong>.
              Click the button below to set your password and activate your account.
            </p>

            <table style="background:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:16px;margin-bottom:24px;width:100%;" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:13px;color:#555;">
                <strong>Login Email:</strong> {$email}<br>
                <strong>Role:</strong> {$roleLabel}
              </td></tr>
            </table>

            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#C9A052;border-radius:6px;">
                  <a href="{$setPasswordUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                    Set Your Password
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;color:#888;font-size:13px;">
              This invitation link expires in <strong>24 hours</strong>. If you did not expect this invitation, you can safely ignore this email.
            </p>
            <p style="margin:16px 0 0;color:#aaa;font-size:12px;word-break:break-all;">
              If the button doesn't work, paste this URL into your browser:<br>
              <a href="{$setPasswordUrl}" style="color:#C9A052;">{$setPasswordUrl}</a>
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;color:#aaa;font-size:12px;">© 2026 Haleelo Tower · Mogadishu, Somalia</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
    }

    private function passwordResetHtml(string $name, string $resetUrl, string $expiry): string
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1B2D4F;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#C9A052;font-size:28px;font-weight:700;letter-spacing:1px;">Haleelo Tower</h1>
            <p style="margin:4px 0 0;color:#ffffff;opacity:0.8;font-size:13px;">Admin Dashboard</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#1B2D4F;font-size:22px;">Reset Your Password</h2>
            <p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">Hi {$name},</p>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
              A password reset was requested for your Haleelo Tower admin account. Click the button below to set a new password.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#C9A052;border-radius:6px;">
                  <a href="{$resetUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;color:#888;font-size:13px;">
              This link expires in <strong>{$expiry}</strong>. If you did not request a password reset, you can safely ignore this email — your password will not change.
            </p>

            <p style="margin:16px 0 0;color:#aaa;font-size:12px;word-break:break-all;">
              If the button above doesn't work, copy and paste this URL into your browser:<br>
              <a href="{$resetUrl}" style="color:#C9A052;">{$resetUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;color:#aaa;font-size:12px;">© 2026 Haleelo Tower · Mogadishu, Somalia</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
    }
}
