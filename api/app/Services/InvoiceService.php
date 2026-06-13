<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\ChartOfAccount;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\Lease;
use App\Models\SystemSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InvoiceService
{
    public function __construct(
        private ReferenceCodeService $refService,
        private AccountingService $accountingService
    ) {}

    /** AR account code by invoice type. */
    private function arCode(string $type): string
    {
        return $type === 'conference_hall' ? '1101' : '1100';
    }

    private function coaId(string $code): ?int
    {
        return ChartOfAccount::where('code', $code)->value('id');
    }

    private function dueDate(Carbon $issueDate): Carbon
    {
        $days = (int) SystemSetting::get('invoice_due_days', env('INVOICE_DUE_DAYS', 7));
        return $issueDate->copy()->addDays($days);
    }

    /**
     * Build an invoice from an approved conference-hall booking.
     */
    public function createForBooking(Booking $booking, ?User $createdBy = null): Invoice
    {
        // Avoid duplicates
        $existing = Invoice::where('booking_id', $booking->id)->whereNull('deleted_at')->first();
        if ($existing) return $existing;

        return DB::transaction(function () use ($booking, $createdBy) {
            $issue = now();

            $invoice = Invoice::create([
                'invoice_code'  => $this->refService->generate('INV'),
                'type'          => 'conference_hall',
                'booking_id'    => $booking->id,
                'bill_to_name'  => $booking->client_name,
                'bill_to_email' => $booking->client_email,
                'bill_to_phone' => $booking->client_phone,
                'issue_date'    => $issue->toDateString(),
                'due_date'      => $this->dueDate($issue)->toDateString(),
                'status'        => 'draft',
                'created_by'    => $createdBy?->id,
            ]);

            // Line items mapped to revenue COA codes
            $this->addLine($invoice, "Hall rental — {$booking->product?->name} ({$booking->session_type})", 1, $booking->base_price, '3001');

            if ((float) $booking->catering_price > 0) {
                $pkgName  = $booking->cateringPackage?->name ?? 'Catering';
                $catCode  = match (strtolower($pkgName)) {
                    'gold'     => '3011',
                    'platinum' => '3012',
                    default    => '3010',
                };
                $this->addLine($invoice, "Catering — {$pkgName}", 1, $booking->catering_price, $catCode);
            }
            if ((float) $booking->dj_price > 0) {
                $this->addLine($invoice, 'DJ service', 1, $booking->dj_price, '3020');
            }
            if ((float) $booking->cameraman_price > 0) {
                $this->addLine($invoice, 'Cameraman service', 1, $booking->cameraman_price, '3020');
            }
            if ((float) $booking->extras_price > 0) {
                $this->addLine($invoice, 'Additional services', 1, $booking->extras_price, '3030');
            }

            $this->recalcTotals($invoice);

            return $invoice->fresh('lineItems');
        });
    }

    /**
     * Monthly rent invoice for an active lease (called by the cron command).
     */
    public function createMonthlyRentInvoice(Lease $lease, ?Carbon $forMonth = null): ?Invoice
    {
        $month = $forMonth ?? now();
        $periodStart = $month->copy()->startOfMonth();
        $periodEnd   = $month->copy()->endOfMonth();

        // Skip if an invoice already exists for this lease + period
        $exists = Invoice::where('lease_id', $lease->id)
            ->whereDate('billing_period_start', $periodStart->toDateString())
            ->whereNull('deleted_at')
            ->exists();
        if ($exists) return null;

        return DB::transaction(function () use ($lease, $periodStart, $periodEnd) {
            $issue = now();
            $isEducational = $lease->billing_cycle === 'semester';

            $invoice = Invoice::create([
                'invoice_code'         => $this->refService->generate('INV'),
                'type'                 => $isEducational ? 'educational' : 'office_rent',
                'tenant_id'            => $lease->tenant_id,
                'lease_id'             => $lease->id,
                'bill_to_name'         => $lease->tenant?->company_name,
                'bill_to_email'        => $lease->tenant?->email,
                'bill_to_phone'        => $lease->tenant?->phone,
                'issue_date'           => $issue->toDateString(),
                'due_date'             => $this->dueDate($issue)->toDateString(),
                'billing_period_start' => $periodStart->toDateString(),
                'billing_period_end'   => $periodEnd->toDateString(),
                'status'               => 'draft',
            ]);

            $amount      = $isEducational ? $lease->semester_amount : $lease->monthly_rent;
            $revenueCode = $isEducational ? '3003' : '3002';
            $label       = $isEducational
                ? "Semester lease — {$lease->space?->name}"
                : "Monthly rent — {$lease->space?->name} ({$periodStart->format('M Y')})";

            $this->addLine($invoice, $label, 1, $amount, $revenueCode);
            $this->recalcTotals($invoice);

            return $invoice->fresh('lineItems');
        });
    }

    /**
     * Manual invoice with arbitrary line items.
     *
     * @param array $data  invoice fields + 'lines' => [['description','quantity','unit_price','account_code_id'], ...]
     */
    public function createManual(array $data, User $createdBy): Invoice
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $issue = Carbon::parse($data['issue_date'] ?? now());

            $invoice = Invoice::create([
                'invoice_code'  => $this->refService->generate('INV'),
                'type'          => $data['type'] ?? 'manual',
                'tenant_id'     => $data['tenant_id'] ?? null,
                'lease_id'      => $data['lease_id'] ?? null,
                'bill_to_name'  => $data['bill_to_name'] ?? null,
                'bill_to_email' => $data['bill_to_email'] ?? null,
                'bill_to_phone' => $data['bill_to_phone'] ?? null,
                'issue_date'    => $issue->toDateString(),
                'due_date'      => isset($data['due_date']) ? $data['due_date'] : $this->dueDate($issue)->toDateString(),
                'lpo_number'    => $data['lpo_number'] ?? null,
                'notes'         => $data['notes'] ?? null,
                'status'        => 'draft',
                'created_by'    => $createdBy->id,
            ]);

            foreach ($data['lines'] as $line) {
                $qty   = $line['quantity'] ?? 1;
                $price = $line['unit_price'];
                InvoiceLineItem::create([
                    'invoice_id'      => $invoice->id,
                    'description'     => $line['description'],
                    'quantity'        => $qty,
                    'unit_price'      => $price,
                    'line_total'      => bcmul((string) $qty, (string) $price, 2),
                    'account_code_id' => $line['account_code_id'] ?? null,
                ]);
            }

            $this->recalcTotals($invoice);

            return $invoice->fresh('lineItems');
        });
    }

    /**
     * Send the invoice: post the AR journal (Debit AR, Credit revenue),
     * mark sent, and dispatch delivery.
     */
    public function markAsSent(Invoice $invoice, User $user): Invoice
    {
        if ($invoice->status !== 'draft') {
            throw new \InvalidArgumentException('Only draft invoices can be sent.');
        }
        if ($invoice->lineItems->isEmpty()) {
            throw new \InvalidArgumentException('Cannot send an invoice with no line items.');
        }

        return DB::transaction(function () use ($invoice, $user) {
            // Build journal lines: Debit AR for the total, Credit each revenue account
            $arId  = $this->coaId($this->arCode($invoice->type));
            $lines = [['account_id' => $arId, 'type' => 'debit', 'amount' => $invoice->total_amount, 'description' => "AR — {$invoice->invoice_code}"]];

            // Group line items by revenue account
            $byAccount = $invoice->lineItems->groupBy('account_code_id');
            foreach ($byAccount as $accountId => $items) {
                $sum = (string) $items->sum('line_total');
                $lines[] = [
                    'account_id'  => $accountId ?: $this->coaId('3030'),
                    'type'        => 'credit',
                    'amount'      => $sum,
                    'description' => "Revenue — {$invoice->invoice_code}",
                ];
            }

            $entry = $this->accountingService->postJournalEntry(
                $invoice->issue_date->toDateString(),
                "Invoice {$invoice->invoice_code} issued to {$invoice->billToName()}",
                $lines,
                'auto',
                $invoice->invoice_code,
                $user
            );

            $invoice->update([
                'status'           => 'sent',
                'sent_at'          => now(),
                'journal_entry_id' => $entry->id,
            ]);

            try {
                dispatch(new \App\Jobs\SendInvoiceJob($invoice->fresh()));
            } catch (\Exception $e) {
                Log::error('Failed to dispatch invoice delivery', ['invoice_id' => $invoice->id, 'error' => $e->getMessage()]);
            }

            return $invoice->fresh(['lineItems', 'payments']);
        });
    }

    public function generateMonthlyInvoices(): int
    {
        $leases = Lease::where('status', 'active')->with(['tenant', 'space'])->get();
        $count  = 0;

        foreach ($leases as $lease) {
            try {
                if ($this->createMonthlyRentInvoice($lease)) {
                    $count++;
                }
            } catch (\Exception $e) {
                Log::error('Failed to auto-generate rent invoice', ['lease_id' => $lease->id, 'error' => $e->getMessage()]);
            }
        }

        return $count;
    }

    /** Recompute subtotal/total from line items. */
    public function recalcTotals(Invoice $invoice): void
    {
        $invoice->load('lineItems');
        $subtotal = (string) $invoice->lineItems->sum('line_total');
        $invoice->update([
            'subtotal'     => $subtotal,
            'total_amount' => $subtotal, // tax defaulted to 0 in Pilot
        ]);
    }

    /**
     * Render the branded invoice PDF and return the raw bytes.
     */
    public function generatePdf(Invoice $invoice): string
    {
        $invoice->load('lineItems');

        $accounts = \App\Models\Account::with('chartOfAccount')->where('active', true)->get()
            ->map(fn ($a) => [
                'name'       => $a->name,
                'type'       => $a->type,
                'identifier' => $a->account_identifier,
            ])->all();

        $building = [
            'name'    => SystemSetting::get('building_name', 'Haleelo Tower'),
            'address' => SystemSetting::get('address', 'Mogadishu, Somalia'),
            'phone'   => SystemSetting::get('contact_phone', ''),
            'email'   => SystemSetting::get('contact_email', ''),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.invoice', compact('invoice', 'accounts', 'building'));

        return $pdf->output();
    }

    private function addLine(Invoice $invoice, string $description, $qty, $unitPrice, string $coaCode): void
    {
        InvoiceLineItem::create([
            'invoice_id'      => $invoice->id,
            'description'     => $description,
            'quantity'        => $qty,
            'unit_price'      => $unitPrice,
            'line_total'      => bcmul((string) $qty, (string) $unitPrice, 2),
            'account_code_id' => $this->coaId($coaCode),
        ]);
    }
}
