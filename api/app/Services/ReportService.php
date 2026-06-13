<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Booking;
use App\Models\ChartOfAccount;
use App\Models\ElectricityReading;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\JournalEntryLine;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\Space;
use App\Models\Tenant;
use App\Models\Vendor;
use App\Models\VendorBill;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Sum of journal-line activity for a COA account within [from, to] by debit/credit. */
    private function activity(int $accountId, string $type, ?string $from, ?string $to): string
    {
        $q = JournalEntryLine::where('account_id', $accountId)->where('type', $type)
            ->whereHas('journalEntry', function ($e) use ($from, $to) {
                if ($from) $e->whereDate('entry_date', '>=', $from);
                if ($to)   $e->whereDate('entry_date', '<=', $to);
            });
        return (string) $q->sum('amount');
    }

    /** Net balance of an account as of a date (signed by normal balance). */
    private function balanceAsOf(ChartOfAccount $a, ?string $asOf): string
    {
        $debit  = $this->activity($a->id, 'debit', null, $asOf);
        $credit = $this->activity($a->id, 'credit', null, $asOf);
        return in_array($a->type, ['asset', 'expense'])
            ? bcsub($debit, $credit, 2)
            : bcsub($credit, $debit, 2);
    }

    // ── 1. Balance Sheet ─────────────────────────────────────────────────────
    public function balanceSheet(?string $asOf = null): array
    {
        $asOf = $asOf ?? now()->toDateString();
        $accounts = ChartOfAccount::orderBy('code')->get();

        $group = fn ($type) => $accounts->where('type', $type)
            ->map(fn ($a) => ['code' => $a->code, 'name' => $a->name, 'balance' => $this->balanceAsOf($a, $asOf)])
            ->filter(fn ($r) => bccomp($r['balance'], '0', 2) !== 0)
            ->values();

        $assets       = $group('asset');
        $liabilities  = $group('liability');
        $equity       = $group('equity');

        $sum = fn ($rows) => $rows->reduce(fn ($c, $r) => bcadd($c, $r['balance'], 2), '0');

        // Current-period earnings (retained) = revenue − expenses up to date
        $revenue  = $accounts->where('type', 'revenue')->reduce(fn ($c, $a) => bcadd($c, $this->balanceAsOf($a, $asOf), 2), '0');
        $expenses = $accounts->where('type', 'expense')->reduce(fn ($c, $a) => bcadd($c, $this->balanceAsOf($a, $asOf), 2), '0');
        $netIncome = bcsub($revenue, $expenses, 2);

        $totalAssets      = $sum($assets);
        $totalLiabilities = $sum($liabilities);
        $totalEquity      = bcadd($sum($equity), $netIncome, 2);

        return [
            'as_of'             => $asOf,
            'assets'            => $assets,
            'liabilities'       => $liabilities,
            'equity'            => $equity,
            'net_income'        => $netIncome,
            'total_assets'      => $totalAssets,
            'total_liabilities' => $totalLiabilities,
            'total_equity'      => $totalEquity,
            'balanced'          => bccomp($totalAssets, bcadd($totalLiabilities, $totalEquity, 2), 2) === 0,
        ];
    }

    // ── 2. Profit & Loss ─────────────────────────────────────────────────────
    public function profitAndLoss(?string $from = null, ?string $to = null): array
    {
        $from = $from ?? now()->startOfYear()->toDateString();
        $to   = $to   ?? now()->toDateString();
        $accounts = ChartOfAccount::orderBy('code')->get();

        $revenue = $accounts->where('type', 'revenue')->map(fn ($a) => [
            'code' => $a->code, 'name' => $a->name,
            'amount' => bcsub($this->activity($a->id, 'credit', $from, $to), $this->activity($a->id, 'debit', $from, $to), 2),
        ])->filter(fn ($r) => bccomp($r['amount'], '0', 2) !== 0)->values();

        $expenses = $accounts->where('type', 'expense')->map(fn ($a) => [
            'code' => $a->code, 'name' => $a->name,
            'amount' => bcsub($this->activity($a->id, 'debit', $from, $to), $this->activity($a->id, 'credit', $from, $to), 2),
        ])->filter(fn ($r) => bccomp($r['amount'], '0', 2) !== 0)->values();

        $totalRevenue  = $revenue->reduce(fn ($c, $r) => bcadd($c, $r['amount'], 2), '0');
        $totalExpenses = $expenses->reduce(fn ($c, $r) => bcadd($c, $r['amount'], 2), '0');

        return [
            'from' => $from, 'to' => $to,
            'revenue' => $revenue, 'expenses' => $expenses,
            'total_revenue' => $totalRevenue,
            'total_expenses' => $totalExpenses,
            'net_profit' => bcsub($totalRevenue, $totalExpenses, 2),
        ];
    }

    // ── 3. Cash Flow (simplified — operating cash from account movements) ────
    public function cashFlow(?string $from = null, ?string $to = null): array
    {
        $from = $from ?? now()->startOfMonth()->toDateString();
        $to   = $to   ?? now()->toDateString();

        $accountIds = Account::pluck('chart_of_account_id')->all();

        $inflow = (string) JournalEntryLine::whereIn('account_id', $accountIds)->where('type', 'debit')
            ->whereHas('journalEntry', fn ($e) => $e->whereDate('entry_date', '>=', $from)->whereDate('entry_date', '<=', $to))
            ->sum('amount');
        $outflow = (string) JournalEntryLine::whereIn('account_id', $accountIds)->where('type', 'credit')
            ->whereHas('journalEntry', fn ($e) => $e->whereDate('entry_date', '>=', $from)->whereDate('entry_date', '<=', $to))
            ->sum('amount');

        $openingBalance = Account::all()->reduce(fn ($c, $a) => bcadd($c, $a->balance(Carbon::parse($from)->subDay()->toDateString()), 2), '0');
        $closingBalance = Account::all()->reduce(fn ($c, $a) => bcadd($c, $a->balance($to), 2), '0');

        return [
            'from' => $from, 'to' => $to,
            'opening_balance' => $openingBalance,
            'cash_in'         => $inflow,
            'cash_out'        => $outflow,
            'net_cash_flow'   => bcsub($inflow, $outflow, 2),
            'closing_balance' => $closingBalance,
        ];
    }

    // ── 4. General Ledger (per account, running balance) ─────────────────────
    public function generalLedger(int $accountId, ?string $from = null, ?string $to = null): array
    {
        $account = ChartOfAccount::findOrFail($accountId);
        $debitNormal = in_array($account->type, ['asset', 'expense']);

        $lines = JournalEntryLine::where('account_id', $accountId)
            ->with('journalEntry')
            ->whereHas('journalEntry', function ($e) use ($from, $to) {
                if ($from) $e->whereDate('entry_date', '>=', $from);
                if ($to)   $e->whereDate('entry_date', '<=', $to);
            })
            ->get()
            ->sortBy(fn ($l) => [$l->journalEntry->entry_date->toDateString(), $l->id])
            ->values();

        $running = '0';
        $rows = $lines->map(function ($l) use (&$running, $debitNormal) {
            $delta = $l->type === 'debit'
                ? ($debitNormal ? $l->amount : bcmul((string) $l->amount, '-1', 2))
                : ($debitNormal ? bcmul((string) $l->amount, '-1', 2) : $l->amount);
            $running = bcadd($running, (string) $delta, 2);
            return [
                'date'        => $l->journalEntry->entry_date->toDateString(),
                'journal_code'=> $l->journalEntry->journal_code,
                'description' => $l->description ?? $l->journalEntry->description,
                'debit'       => $l->type === 'debit' ? $l->amount : '0.00',
                'credit'      => $l->type === 'credit' ? $l->amount : '0.00',
                'balance'     => $running,
            ];
        });

        return [
            'account' => ['code' => $account->code, 'name' => $account->name, 'type' => $account->type],
            'from' => $from, 'to' => $to,
            'rows' => $rows,
            'closing_balance' => $running,
        ];
    }

    // ── 5. Aged Receivables ──────────────────────────────────────────────────
    public function agedReceivables(): array
    {
        $buckets = ['current' => '0', '31_60' => '0', '61_90' => '0', '90_plus' => '0'];
        $rows = [];

        foreach (Invoice::unpaid()->with('tenant')->get() as $inv) {
            $balance = $inv->balanceDue();
            if (bccomp($balance, '0', 2) <= 0) continue;
            $age = now()->startOfDay()->diffInDays($inv->due_date, false) * -1; // days overdue

            $bucket = $age <= 30 ? 'current' : ($age <= 60 ? '31_60' : ($age <= 90 ? '61_90' : '90_plus'));
            $buckets[$bucket] = bcadd($buckets[$bucket], $balance, 2);

            $rows[] = [
                'invoice_code' => $inv->invoice_code,
                'customer'     => $inv->billToName(),
                'due_date'     => $inv->due_date->toDateString(),
                'days_overdue' => max(0, $age),
                'balance'      => $balance,
                'bucket'       => $bucket,
            ];
        }

        return ['rows' => $rows, 'buckets' => $buckets, 'total' => array_reduce($buckets, fn ($c, $v) => bcadd($c, $v, 2), '0')];
    }

    // ── 6. Aged Payables ─────────────────────────────────────────────────────
    public function agedPayables(): array
    {
        $buckets = ['current' => '0', '31_60' => '0', '61_90' => '0', '90_plus' => '0'];
        $rows = [];

        foreach (VendorBill::unpaid()->with('vendor')->get() as $bill) {
            $balance = $bill->balanceDue();
            if (bccomp($balance, '0', 2) <= 0) continue;
            $due = $bill->due_date ?? $bill->bill_date;
            $age = now()->startOfDay()->diffInDays($due, false) * -1;

            $bucket = $age <= 30 ? 'current' : ($age <= 60 ? '31_60' : ($age <= 90 ? '61_90' : '90_plus'));
            $buckets[$bucket] = bcadd($buckets[$bucket], $balance, 2);

            $rows[] = [
                'bill_code'    => $bill->bill_code,
                'vendor'       => $bill->vendor?->name,
                'due_date'     => $due?->toDateString(),
                'days_overdue' => max(0, $age),
                'balance'      => $balance,
                'bucket'       => $bucket,
            ];
        }

        return ['rows' => $rows, 'buckets' => $buckets, 'total' => array_reduce($buckets, fn ($c, $v) => bcadd($c, $v, 2), '0')];
    }

    // ── 7. Partner Ledger (per tenant or vendor) ─────────────────────────────
    public function partnerLedger(string $partnerType, int $partnerId): array
    {
        if ($partnerType === 'tenant') {
            $tenant   = Tenant::findOrFail($partnerId);
            $invoices = Invoice::where('tenant_id', $partnerId)->with('payments')->get();
            $rows = $invoices->map(fn ($i) => [
                'document'   => $i->invoice_code,
                'date'       => $i->issue_date->toDateString(),
                'total'      => $i->total_amount,
                'paid'       => $i->amountPaid(),
                'balance'    => $i->balanceDue(),
                'status'     => $i->status,
            ]);
            $outstanding = $invoices->reduce(fn ($c, $i) => bcadd($c, $i->balanceDue(), 2), '0');
            return ['partner' => $tenant->company_name, 'type' => 'tenant', 'rows' => $rows, 'outstanding' => $outstanding];
        }

        $vendor = Vendor::findOrFail($partnerId);
        $bills  = VendorBill::where('vendor_id', $partnerId)->with('payments')->get();
        $rows = $bills->map(fn ($b) => [
            'document' => $b->bill_code,
            'date'     => $b->bill_date->toDateString(),
            'total'    => $b->total_amount,
            'paid'     => $b->amountPaid(),
            'balance'  => $b->balanceDue(),
            'status'   => $b->status,
        ]);
        $outstanding = $bills->reduce(fn ($c, $b) => bcadd($c, $b->balanceDue(), 2), '0');
        return ['partner' => $vendor->name, 'type' => 'vendor', 'rows' => $rows, 'outstanding' => $outstanding];
    }

    // ── 8. Revenue Report (by source) ────────────────────────────────────────
    public function revenueReport(?string $from = null, ?string $to = null): array
    {
        $pl = $this->profitAndLoss($from, $to);
        return ['from' => $pl['from'], 'to' => $pl['to'], 'sources' => $pl['revenue'], 'total' => $pl['total_revenue']];
    }

    // ── 9. Expense Report (by category) ──────────────────────────────────────
    public function expenseReport(?string $from = null, ?string $to = null): array
    {
        $pl = $this->profitAndLoss($from, $to);
        return ['from' => $pl['from'], 'to' => $pl['to'], 'categories' => $pl['expenses'], 'total' => $pl['total_expenses']];
    }

    // ── 10. Bookings Report ──────────────────────────────────────────────────
    public function bookingsReport(?string $from = null, ?string $to = null, ?string $status = null): array
    {
        $q = Booking::with('product')->withoutTrashed();
        if ($from)   $q->whereDate('booking_date', '>=', $from);
        if ($to)     $q->whereDate('booking_date', '<=', $to);
        if ($status) $q->where('status', $status);

        $bookings = $q->latest('booking_date')->get();
        $rows = $bookings->map(fn ($b) => [
            'booking_code' => $b->booking_code,
            'client'       => $b->client_name,
            'product'      => $b->product?->name,
            'date'         => $b->booking_date->toDateString(),
            'session'      => $b->session_type,
            'status'       => $b->status,
            'total'        => $b->total_price,
        ]);

        return ['from' => $from, 'to' => $to, 'rows' => $rows, 'count' => $rows->count(),
                'total_value' => $bookings->reduce(fn ($c, $b) => bcadd($c, (string) $b->total_price, 2), '0')];
    }

    // ── 11. Payment Report ───────────────────────────────────────────────────
    public function paymentReport(?string $from = null, ?string $to = null): array
    {
        $q = Payment::with(['account', 'invoice', 'vendorBill']);
        if ($from) $q->whereDate('payment_date', '>=', $from);
        if ($to)   $q->whereDate('payment_date', '<=', $to);
        $payments = $q->latest('payment_date')->get();

        $byAccount = $payments->groupBy('account.name')->map(fn ($g, $name) => [
            'account' => $name,
            'receipts' => $g->where('type', 'customer_receipt')->sum('amount'),
            'payments' => $g->where('type', 'vendor_payment')->sum('amount'),
        ])->values();

        return [
            'from' => $from, 'to' => $to,
            'rows' => $payments->map(fn ($p) => [
                'payment_code'  => $p->payment_code,
                'type'          => $p->type,
                'document'      => $p->invoice?->invoice_code ?? $p->vendorBill?->bill_code,
                'date'          => $p->payment_date->toDateString(),
                'method'        => $p->payment_method,
                'account'       => $p->account?->name,
                'amount'        => $p->amount,
            ]),
            'by_account'      => $byAccount,
            'total_receipts'  => (string) $payments->where('type', 'customer_receipt')->sum('amount'),
            'total_payments'  => (string) $payments->where('type', 'vendor_payment')->sum('amount'),
        ];
    }

    // ── 12. Invoice Analysis (by type/status) ────────────────────────────────
    public function invoiceAnalysis(?string $from = null, ?string $to = null): array
    {
        $q = Invoice::query();
        if ($from) $q->whereDate('issue_date', '>=', $from);
        if ($to)   $q->whereDate('issue_date', '<=', $to);
        $invoices = $q->get();

        $byType = $invoices->groupBy('type')->map(fn ($g, $t) => [
            'type' => $t, 'count' => $g->count(), 'total' => (string) $g->sum('total_amount'),
        ])->values();

        $byStatus = $invoices->groupBy('status')->map(fn ($g, $s) => [
            'status' => $s, 'count' => $g->count(), 'total' => (string) $g->sum('total_amount'),
        ])->values();

        return [
            'from' => $from, 'to' => $to,
            'by_type' => $byType, 'by_status' => $byStatus,
            'count' => $invoices->count(), 'total' => (string) $invoices->sum('total_amount'),
        ];
    }

    // ── 13. Electricity Billing Report ───────────────────────────────────────
    public function electricityReport(?string $from = null, ?string $to = null): array
    {
        $q = ElectricityReading::with(['tenant', 'space']);
        if ($from) $q->whereDate('reading_date', '>=', $from);
        if ($to)   $q->whereDate('reading_date', '<=', $to);
        $readings = $q->latest('reading_date')->get();

        return [
            'from' => $from, 'to' => $to,
            'rows' => $readings->map(fn ($r) => [
                'bill_code' => $r->electricity_bill_code,
                'tenant'    => $r->tenant?->company_name,
                'space'     => $r->space?->name,
                'period'    => $r->billing_period_month,
                'previous'  => $r->previous_reading,
                'current'   => $r->current_reading,
                'kwh'       => $r->kwh_consumed,
                'rate'      => $r->rate_per_kwh,
                'charge'    => $r->total_charge,
                'status'    => $r->status,
            ]),
            'total_kwh'    => (string) $readings->sum('kwh_consumed'),
            'total_charge' => (string) $readings->sum('total_charge'),
        ];
    }

    // ── 14. Occupancy Report ─────────────────────────────────────────────────
    public function occupancyReport(?string $from = null, ?string $to = null): array
    {
        $from = $from ?? now()->startOfMonth()->toDateString();
        $to   = $to   ?? now()->toDateString();
        $days = Carbon::parse($from)->diffInDays(Carbon::parse($to)) + 1;

        $spaces = Space::with('floor')->get();
        $rows = $spaces->map(function ($s) use ($from, $to, $days) {
            if ($s->type === 'conference_hall') {
                $booked = Booking::where('product_id', $s->id)
                    ->where('status', 'booking_approved')
                    ->whereBetween('booking_date', [$from, $to])->count();
                $capacity = $days; // one session-day baseline
                return ['space' => $s->name, 'floor' => $s->floor?->name, 'type' => $s->type,
                        'booked' => $booked, 'available' => $capacity,
                        'rate' => $capacity > 0 ? round($booked / $capacity * 100, 1) : 0];
            }
            // office/educational: occupied if an active lease overlaps the period
            $leased = Lease::where('space_id', $s->id)->where('status', 'active')
                ->whereDate('start_date', '<=', $to)->whereDate('end_date', '>=', $from)->exists();
            return ['space' => $s->name, 'floor' => $s->floor?->name, 'type' => $s->type,
                    'booked' => $leased ? $days : 0, 'available' => $days,
                    'rate' => $leased ? 100 : 0];
        });

        return ['from' => $from, 'to' => $to, 'rows' => $rows];
    }

    // ── Payroll Summary (by department / month) ─────────────────────────────
    public function payrollSummary(?string $month = null): array
    {
        $q = \App\Models\PayrollRun::where('status', 'finalized')->with('payslips.employee');
        if ($month) $q->where('month', $month);
        $runs = $q->get();

        $payslips = $runs->flatMap->payslips;
        $byDept = $payslips->groupBy(fn ($p) => $p->employee?->department ?? 'unknown')->map(fn ($g, $dept) => [
            'department'  => $dept,
            'employees'   => $g->count(),
            'gross'       => (string) $g->sum('gross_pay'),
            'deductions'  => (string) $g->sum('total_deductions'),
            'net'         => (string) $g->sum('net_pay'),
        ])->values();

        return [
            'month'            => $month,
            'departments'      => $byDept,
            'total_gross'      => (string) $payslips->sum('gross_pay'),
            'total_deductions' => (string) $payslips->sum('total_deductions'),
            'total_net'        => (string) $payslips->sum('net_pay'),
            'employee_count'   => $payslips->count(),
        ];
    }

    // ── 15. Revenue Trend (last 12 months, from payments received) ───────────
    public function revenueTrend(): array
    {
        $months = [];
        for ($i = 11; $i >= 0; $i--) {
            $m = now()->subMonths($i);
            $total = Payment::where('type', 'customer_receipt')
                ->whereYear('payment_date', $m->year)
                ->whereMonth('payment_date', $m->month)
                ->sum('amount');
            $months[] = ['month' => $m->format('M Y'), 'revenue' => (float) $total];
        }
        return $months;
    }

    // ── 16. Revenue by Source (doughnut) ─────────────────────────────────────
    public function revenueBySource(?string $from = null, ?string $to = null): array
    {
        $from = $from ?? now()->startOfYear()->toDateString();
        $to   = $to   ?? now()->toDateString();

        // Group revenue COA accounts into friendly buckets
        $map = [
            'Conference Halls' => ['3001'],
            'Office Rentals'   => ['3002'],
            'Educational'      => ['3003'],
            'Catering'         => ['3010', '3011', '3012'],
            'Add-ons'          => ['3020', '3030'],
        ];

        $result = [];
        foreach ($map as $label => $codes) {
            $sum = '0';
            foreach ($codes as $code) {
                $a = ChartOfAccount::where('code', $code)->first();
                if ($a) $sum = bcadd($sum, bcsub($this->activity($a->id, 'credit', $from, $to), $this->activity($a->id, 'debit', $from, $to), 2), 2);
            }
            if (bccomp($sum, '0', 2) > 0) $result[] = ['source' => $label, 'amount' => (float) $sum];
        }
        return $result;
    }

    // ── 17. Demand Analytics ─────────────────────────────────────────────────
    public function demandAnalytics(): array
    {
        $topSpaces = Booking::select('product_id', DB::raw('count(*) as cnt'))
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->groupBy('product_id')->orderByDesc('cnt')->limit(3)->get()
            ->map(fn ($b) => ['space' => Space::find($b->product_id)?->name, 'bookings' => (int) $b->cnt]);

        $topSessions = Booking::select('session_type', DB::raw('count(*) as cnt'))
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->groupBy('session_type')->orderByDesc('cnt')->get()
            ->map(fn ($b) => ['session' => $b->session_type, 'bookings' => (int) $b->cnt]);

        return ['top_spaces' => $topSpaces, 'top_sessions' => $topSessions];
    }
}
