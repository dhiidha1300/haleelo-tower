<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\ElectricityRate;
use App\Models\ElectricityReading;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ElectricityService
{
    public function __construct(
        private ReferenceCodeService $refService,
        private InvoiceService $invoiceService
    ) {}

    /** The most recent reading for a tenant+space (to auto-fill previous reading). */
    public function lastReading(int $tenantId, int $spaceId): ?ElectricityReading
    {
        return ElectricityReading::where('tenant_id', $tenantId)
            ->where('space_id', $spaceId)
            ->orderByDesc('reading_date')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Record a meter reading. Calculates consumption and charge from the
     * rate active on the reading date (snapshotted onto the record).
     */
    public function recordReading(array $data, User $user): ElectricityReading
    {
        $last     = $this->lastReading($data['tenant_id'], $data['space_id']);
        $previous = $data['previous_reading'] ?? ($last?->current_reading ?? 0);
        $current  = (float) $data['current_reading'];

        if ($current < (float) $previous) {
            throw new \InvalidArgumentException('Current reading cannot be less than the previous reading.');
        }

        $rate = ElectricityRate::forDate($data['reading_date']);
        if (!$rate) {
            throw new \InvalidArgumentException('No electricity rate is configured for the reading date. Set one in Settings → Electricity.');
        }

        $kwh    = bcsub((string) $current, (string) $previous, 2);
        $charge = bcmul($kwh, (string) $rate->rate_per_kwh, 2);

        return ElectricityReading::create([
            'electricity_bill_code' => $this->refService->generate('ELEC'),
            'tenant_id'             => $data['tenant_id'],
            'space_id'              => $data['space_id'],
            'reading_date'          => $data['reading_date'],
            'billing_period_month'  => Carbon::parse($data['reading_date'])->format('Y-m'),
            'previous_reading'      => $previous,
            'current_reading'       => $current,
            'kwh_consumed'          => $kwh,
            'rate_id'               => $rate->id,
            'rate_per_kwh'          => $rate->rate_per_kwh,
            'total_charge'          => $charge,
            'status'                => 'recorded',
            'created_by'            => $user->id,
        ])->load(['tenant', 'space']);
    }

    /**
     * Add a recorded reading as a line item on an existing DRAFT invoice
     * (e.g. the tenant's monthly rent invoice), rather than billing separately.
     */
    public function addToInvoice(ElectricityReading $reading, Invoice $invoice, User $user): Invoice
    {
        if ($reading->status === 'invoiced') {
            throw new \InvalidArgumentException('This reading has already been invoiced.');
        }
        if ($invoice->status !== 'draft') {
            throw new \InvalidArgumentException('Electricity can only be added to a draft invoice.');
        }
        if ($invoice->tenant_id && $reading->tenant_id && $invoice->tenant_id !== $reading->tenant_id) {
            throw new \InvalidArgumentException('That invoice belongs to a different tenant.');
        }

        return DB::transaction(function () use ($reading, $invoice, $user) {
            $revenueCoa = ChartOfAccount::where('code', '3030')->value('id');

            InvoiceLineItem::create([
                'invoice_id'             => $invoice->id,
                'description'            => "Electricity — {$reading->space?->name} ({$reading->billing_period_month}): {$reading->kwh_consumed} kWh × \${$reading->rate_per_kwh}",
                'quantity'               => $reading->kwh_consumed,
                'unit_price'             => $reading->rate_per_kwh,
                'line_total'             => $reading->total_charge,
                'account_code_id'        => $revenueCoa,
                'electricity_reading_id' => $reading->id,
            ]);

            $this->invoiceService->recalcTotals($invoice);
            $reading->update(['invoice_id' => $invoice->id, 'status' => 'invoiced']);

            return $invoice->fresh('lineItems');
        });
    }

    /**
     * Generate a standalone electricity invoice for a recorded reading.
     */
    public function generateInvoice(ElectricityReading $reading, User $user): Invoice
    {
        if ($reading->status === 'invoiced') {
            throw new \InvalidArgumentException('This reading has already been invoiced.');
        }

        return DB::transaction(function () use ($reading, $user) {
            $issue = now();

            $invoice = Invoice::create([
                'invoice_code'  => $this->refService->generate('INV'),
                'type'          => 'electricity',
                'tenant_id'     => $reading->tenant_id,
                'bill_to_name'  => $reading->tenant?->company_name,
                'bill_to_email' => $reading->tenant?->email,
                'bill_to_phone' => $reading->tenant?->phone,
                'issue_date'    => $issue->toDateString(),
                'due_date'      => $issue->copy()->addDays((int) \App\Models\SystemSetting::get('invoice_due_days', 7))->toDateString(),
                'status'        => 'draft',
                'created_by'    => $user->id,
            ]);

            $revenueCoa = ChartOfAccount::where('code', '3030')->value('id'); // Additional Services Revenue

            InvoiceLineItem::create([
                'invoice_id'             => $invoice->id,
                'description'            => "Electricity — {$reading->space?->name} ({$reading->billing_period_month}): {$reading->kwh_consumed} kWh × \${$reading->rate_per_kwh}",
                'quantity'               => $reading->kwh_consumed,
                'unit_price'             => $reading->rate_per_kwh,
                'line_total'             => $reading->total_charge,
                'account_code_id'        => $revenueCoa,
                'electricity_reading_id' => $reading->id,
            ]);

            $this->invoiceService->recalcTotals($invoice);

            $reading->update(['invoice_id' => $invoice->id, 'status' => 'invoiced']);

            return $invoice->fresh('lineItems');
        });
    }
}
