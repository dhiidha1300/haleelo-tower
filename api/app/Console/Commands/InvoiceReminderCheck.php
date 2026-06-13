<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Resend;

class InvoiceReminderCheck extends Command
{
    protected $signature   = 'invoices:reminder-check';
    protected $description = 'Update overdue statuses and dispatch invoice reminders (3 days before, on due, overdue)';

    public function handle(): int
    {
        $today = now()->toDateString();

        // 1. Mark unpaid invoices past their due date as overdue
        $markedOverdue = Invoice::whereIn('status', ['sent', 'partial'])
            ->whereDate('due_date', '<', $today)
            ->update(['status' => 'overdue']);

        // 2. Dispatch reminders for upcoming + overdue unpaid invoices
        $reminderTargets = Invoice::unpaid()->with('tenant')->get();
        $sent = 0;
        $escalated = [];

        foreach ($reminderTargets as $invoice) {
            $dueIn = now()->startOfDay()->diffInDays($invoice->due_date, false);

            // 3 days before, on due date, or overdue → remind the client
            if (in_array($dueIn, [3, 0]) || $dueIn < 0) {
                try {
                    dispatch(new \App\Jobs\SendInvoiceJob($invoice));
                    $sent++;
                } catch (\Exception $e) {
                    Log::error('Failed to dispatch invoice reminder', ['invoice_id' => $invoice->id, 'error' => $e->getMessage()]);
                }
            }

            // 7+ days overdue → escalate to Admin (fires once, on day 7)
            if ($dueIn === -7) {
                $escalated[] = $invoice;
            }
        }

        if (!empty($escalated)) {
            $this->sendAdminEscalation($escalated);
        }

        $this->info("Marked {$markedOverdue} invoice(s) overdue. Dispatched {$sent} reminder(s). Escalated " . count($escalated) . " to Admin.");

        return Command::SUCCESS;
    }

    /** Email Admin + Super Admin about invoices that are 7 days overdue. */
    private function sendAdminEscalation(array $invoices): void
    {
        $apiKey = SystemSetting::get('resend_api_key', env('RESEND_API_KEY', ''));
        $recipients = User::role(['super_admin', 'admin'])->where('status', 'active')->pluck('email')->filter()->all();
        if (!$apiKey || empty($recipients)) return;

        $rows = collect($invoices)->map(fn ($i) =>
            "<tr><td style='padding:6px;border-bottom:1px solid #eee;'>{$i->invoice_code}</td><td style='padding:6px;border-bottom:1px solid #eee;'>{$i->billToName()}</td><td style='padding:6px;border-bottom:1px solid #eee;text-align:right;'>\${$i->balanceDue()}</td></tr>"
        )->implode('');

        try {
            Resend::client($apiKey)->emails->send([
                'from'    => SystemSetting::get('resend_from_name', 'Haleelo Tower') . ' <' . SystemSetting::get('resend_from_email', config('mail.from.address')) . '>',
                'to'      => $recipients,
                'subject' => 'Overdue Invoices — 7+ Days (Action Required)',
                'html'    => "<p>The following invoices are 7 days overdue and need follow-up:</p><table style='width:100%;border-collapse:collapse;'><tr><th style='text-align:left;padding:6px;'>Invoice</th><th style='text-align:left;padding:6px;'>Customer</th><th style='text-align:right;padding:6px;'>Balance</th></tr>{$rows}</table>",
            ]);
        } catch (\Exception $e) {
            Log::error('Admin overdue escalation failed', ['error' => $e->getMessage()]);
        }
    }
}
