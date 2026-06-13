<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\ReportService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Resend;

class GenerateMonthlyReport extends Command
{
    protected $signature   = 'reports:monthly';
    protected $description = 'Compile and email the monthly financial summary to Admin + Super Admin';

    public function handle(ReportService $reports): int
    {
        $from = now()->startOfMonth()->toDateString();
        $to   = now()->endOfMonth()->toDateString();

        $pl       = $reports->profitAndLoss($from, $to);
        $agedAr   = $reports->agedReceivables();
        $bookings = Booking::whereBetween('booking_date', [$from, $to])->get();
        $overdue  = Invoice::overdue()->get();
        $demand   = $reports->demandAnalytics();

        $summary = [
            'period'        => now()->format('F Y'),
            'revenue'       => $pl['total_revenue'],
            'expenses'      => $pl['total_expenses'],
            'net_profit'    => $pl['net_profit'],
            'bookings'      => $bookings->count(),
            'overdue_count' => $overdue->count(),
            'overdue_total' => (string) $overdue->reduce(fn ($c, $i) => bcadd($c, $i->balanceDue(), 2), '0'),
            'ar_total'      => $agedAr['total'],
            'top_space'     => $demand['top_spaces'][0]['space'] ?? '—',
        ];

        // Recipients: Admin + Super Admin
        $recipients = User::role(['super_admin', 'admin'])->where('status', 'active')->pluck('email')->filter()->all();

        $apiKey = SystemSetting::get('resend_api_key', env('RESEND_API_KEY', ''));
        if ($apiKey && !empty($recipients)) {
            try {
                $sender = SystemSetting::get('resend_from_name', 'Haleelo Tower') . ' <' . SystemSetting::get('resend_from_email', config('mail.from.address')) . '>';
                Resend::client($apiKey)->emails->send([
                    'from'    => $sender,
                    'to'      => $recipients,
                    'subject' => "Monthly Financial Report — {$summary['period']}",
                    'html'    => $this->html($summary),
                ]);
                $this->info('Monthly report emailed to ' . count($recipients) . ' recipient(s).');
            } catch (\Exception $e) {
                Log::error('Monthly report email failed', ['error' => $e->getMessage()]);
                $this->warn('Email failed (logged): ' . $e->getMessage());
            }
        } else {
            $this->warn('Resend not configured or no recipients — report computed but not emailed.');
        }

        $this->table(
            ['Metric', 'Value'],
            collect($summary)->map(fn ($v, $k) => [$k, $v])->values()->all()
        );

        return Command::SUCCESS;
    }

    private function html(array $s): string
    {
        $net = number_format((float) $s['net_profit'], 2);
        return <<<HTML
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#1B2D4F;color:#fff;padding:24px;text-align:center;">
    <h1 style="color:#C9A052;margin:0;">Haleelo Tower</h1>
    <p style="margin:4px 0 0;">Monthly Financial Report — {$s['period']}</p>
  </div>
  <div style="padding:24px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Total Revenue</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#16a34a;font-weight:bold;">\${$s['revenue']}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Total Expenses</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#dc2626;font-weight:bold;">\${$s['expenses']}</td></tr>
      <tr><td style="padding:8px;border-bottom:2px solid #1B2D4F;font-weight:bold;">Net Profit / Loss</td><td style="padding:8px;border-bottom:2px solid #1B2D4F;text-align:right;font-weight:bold;">\${$net}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Bookings this month</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">{$s['bookings']}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Overdue Invoices</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">{$s['overdue_count']} (\${$s['overdue_total']})</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;">Outstanding Receivables</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">\${$s['ar_total']}</td></tr>
      <tr><td style="padding:8px;">Top-performing space</td><td style="padding:8px;text-align:right;">{$s['top_space']}</td></tr>
    </table>
  </div>
  <div style="background:#f9f9f9;padding:16px;text-align:center;color:#aaa;font-size:12px;">© Haleelo Tower · Mogadishu, Somalia</div>
</div>
HTML;
    }
}
