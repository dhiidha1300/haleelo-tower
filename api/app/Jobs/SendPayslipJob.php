<?php

namespace App\Jobs;

use App\Models\Payslip;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendPayslipJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public Payslip $payslip) {}

    public function handle(): void
    {
        $emp = $this->payslip->employee;
        if (!$emp) return;

        $month = $this->payslip->payrollRun?->month;
        $net   = number_format((float) $this->payslip->net_pay, 2);
        $message = "Hello {$emp->full_name}, your payslip for {$month} is ready. Net pay: \${$net}. Code: {$this->payslip->payslip_code}.";

        try {
            if ($emp->phone) {
                app(\App\Services\WhatsAppService::class)->send($emp->phone, $message);
                $this->payslip->update(['sent_via_whatsapp' => true]);
            }
        } catch (\Exception $e) {
            Log::error('Payslip WhatsApp failed', ['payslip_id' => $this->payslip->id, 'error' => $e->getMessage()]);
        }

        try {
            if ($emp->email) {
                app(\App\Services\EmailService::class)->sendPayslip($this->payslip);
                $this->payslip->update(['sent_via_email' => true]);
            }
        } catch (\Exception $e) {
            Log::error('Payslip email failed', ['payslip_id' => $this->payslip->id, 'error' => $e->getMessage()]);
        }
    }
}
