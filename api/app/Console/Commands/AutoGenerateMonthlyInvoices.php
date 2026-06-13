<?php

namespace App\Console\Commands;

use App\Services\InvoiceService;
use Illuminate\Console\Command;

class AutoGenerateMonthlyInvoices extends Command
{
    protected $signature   = 'invoices:generate-monthly';
    protected $description = 'Auto-generate monthly rent invoices for all active leases';

    public function handle(InvoiceService $invoiceService): int
    {
        $count = $invoiceService->generateMonthlyInvoices();
        $this->info("Generated {$count} monthly rent invoice(s).");

        return Command::SUCCESS;
    }
}
