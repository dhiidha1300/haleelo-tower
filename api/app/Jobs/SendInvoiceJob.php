<?php

namespace App\Jobs;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendInvoiceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public Invoice $invoice) {}

    public function handle(): void
    {
        try {
            $whatsapp = app(\App\Services\WhatsAppService::class);

            $name   = $this->invoice->billToName();
            $code   = $this->invoice->invoice_code;
            $amount = number_format((float) $this->invoice->total_amount, 2);
            $due    = $this->invoice->due_date->format('d M Y');
            $message = "Hello {$name}, invoice {$code} for \${$amount} has been issued and is due on {$due}. Pay via Edahab/ZAAD/Bank quoting your invoice code.";

            if ($this->invoice->bill_to_phone) {
                $whatsapp->send($this->invoice->bill_to_phone, $message);
            }

            // Email with PDF attachment (handled by EmailService if configured)
            if ($this->invoice->bill_to_email) {
                app(\App\Services\EmailService::class)->sendInvoice($this->invoice);
            }
        } catch (\Exception $e) {
            Log::error('SendInvoiceJob failed', ['invoice_id' => $this->invoice->id, 'error' => $e->getMessage()]);
        }
    }
}
