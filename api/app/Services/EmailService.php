<?php

namespace App\Services;

class EmailService
{
    public function __construct(
        private MailService $mail,
        private TemplateRenderer $renderer
    ) {}

    /** True when at least one transport (SMTP or Resend) is usable. */
    private function ready(): bool
    {
        return $this->mail->effectiveDriver() !== null;
    }

    public function sendPasswordReset(string $toEmail, string $toName, string $resetUrl): void
    {
        if (!$this->ready()) {
            throw new \Exception('No mail transport is configured. Set up SMTP or Resend in Settings → Email.');
        }
        $r = $this->renderer->render('password_reset', [
            'name' => $toName, 'reset_url' => $resetUrl, 'expiry' => '60 minutes',
        ]);
        $this->mail->send($toEmail, $r['subject'], $r['html']);
    }

    public function sendUserInvite(string $toEmail, string $toName, string $role, string $setPasswordUrl): void
    {
        if (!$this->ready()) {
            throw new \Exception('No mail transport is configured. Set up SMTP or Resend in Settings → Email.');
        }
        $r = $this->renderer->render('user_invite', [
            'name' => $toName, 'email' => $toEmail,
            'role' => ucfirst(str_replace('_', ' ', $role)),
            'set_password_url' => $setPasswordUrl,
        ]);
        $this->mail->send($toEmail, $r['subject'], $r['html']);
    }

    public function sendInvoice(\App\Models\Invoice $invoice): void
    {
        if (!$this->ready() || !$invoice->bill_to_email) return;

        $pdf    = app(\App\Services\InvoiceService::class)->generatePdf($invoice);
        $amount = number_format((float) $invoice->total_amount, 2);

        $r = $this->renderer->render('invoice', [
            'name' => $invoice->billToName(),
            'invoice_code' => $invoice->invoice_code,
            'amount' => $amount,
            'due_date' => $invoice->due_date->format('d M Y'),
        ]);

        $this->mail->send($invoice->bill_to_email, $r['subject'], $r['html'], [
            ['filename' => "{$invoice->invoice_code}.pdf", 'content' => $pdf],
        ]);
    }

    public function sendPayslip(\App\Models\Payslip $slip): void
    {
        $emp = $slip->employee;
        if (!$this->ready() || !$emp?->email) return;

        $net   = number_format((float) $slip->net_pay, 2);
        $month = $slip->payrollRun?->month;

        $r = $this->renderer->render('payslip', [
            'name' => $emp->full_name,
            'payslip_code' => $slip->payslip_code,
            'month' => (string) $month,
            'net' => $net,
        ]);

        $attachments = [];
        if ($slip->pdf_file_url) {
            try {
                $pdf = app(\App\Services\PayrollService::class)->generatePayslipPdf($slip);
                $attachments[] = ['filename' => "{$slip->payslip_code}.pdf", 'content' => $pdf];
            } catch (\Exception $e) { /* send without attachment */ }
        }

        $this->mail->send($emp->email, $r['subject'], $r['html'], $attachments);
    }

    public function sendBookingNotification(\App\Models\Booking $booking, string $eventType, string $message): void
    {
        if (!$this->ready() || !$booking->client_email) return;

        $labels = [
            'acknowledged' => 'Request Received',
            'approved'     => 'Confirmed',
            'rejected'     => 'Not Approved',
            'cancelled'    => 'Cancelled',
        ];

        $r = $this->renderer->render('booking_notification', [
            'name' => $booking->client_name,
            'message' => $message,
            'booking_code' => $booking->booking_code,
            'status_label' => $labels[$eventType] ?? 'Update',
        ]);

        $this->mail->send($booking->client_email, $r['subject'], $r['html']);
    }

    public function sendWaitlist(\App\Models\WaitingList $entry, string $subject, string $message): void
    {
        if (!$this->ready() || !$entry->client_email) return;

        $r = $this->renderer->render('waitlist', [
            'name' => $entry->client_name,
            'subject' => $subject,
            'message' => $message,
        ]);

        $this->mail->send($entry->client_email, $r['subject'], $r['html']);
    }

    public function sendLeaseRenewalReminder(\App\Models\Lease $lease): void
    {
        if (!$this->ready() || !$lease->tenant?->email) return;

        $r = $this->renderer->render('lease_renewal', [
            'name' => $lease->tenant->contact_person_name,
            'space' => $lease->space?->name ?? 'your space',
            'end_date' => $lease->end_date?->format('d M Y') ?? '',
        ]);

        $this->mail->send($lease->tenant->email, $r['subject'], $r['html']);
    }
}
