<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WaitingList;
use App\Models\Account;
use App\Models\VendorBill;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    /** Charts + account balances for the management dashboard. */
    public function charts(ReportService $reports): JsonResponse
    {
        return response()->json([
            'revenue_trend'    => $reports->revenueTrend(),
            'revenue_by_source'=> $reports->revenueBySource(),
            'demand'           => $reports->demandAnalytics(),
            'account_balances' => Account::all()->map(fn ($a) => [
                'name'    => $a->name,
                'type'    => $a->type,
                'balance' => $a->balance(),
            ]),
        ]);
    }

    /** Finance-role dashboard: money in, money out, balances and receivables. */
    public function finance(ReportService $reports): JsonResponse
    {
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd   = now()->endOfMonth()->toDateString();

        // ── Revenue (cash received) ──────────────────────────────────────────
        $revenueThisMonth = (string) Payment::where('type', 'customer_receipt')
            ->whereBetween('payment_date', [$monthStart, $monthEnd])->sum('amount');
        $revenueYtd = (string) Payment::where('type', 'customer_receipt')
            ->whereYear('payment_date', now()->year)->sum('amount');

        // ── Expenses (direct expenses + vendor-bill payments out) ────────────
        $expenseThisMonth = (string) \App\Models\Expense::whereBetween('expense_date', [$monthStart, $monthEnd])->sum('amount');
        $expenseYtd       = (string) \App\Models\Expense::whereYear('expense_date', now()->year)->sum('amount');

        // Expense breakdown by COA category (YTD, top 6)
        $expenseByCategory = \App\Models\Expense::whereYear('expense_date', now()->year)
            ->with('expenseAccount')
            ->get()
            ->groupBy(fn ($e) => $e->expenseAccount?->name ?? 'Uncategorised')
            ->map(fn ($g) => (float) $g->sum('amount'))
            ->sortDesc()
            ->take(6)
            ->map(fn ($amount, $name) => ['category' => $name, 'amount' => $amount])
            ->values();

        // ── Accounts Receivable ──────────────────────────────────────────────
        $overdue       = Invoice::overdue();
        $overdueCount  = (clone $overdue)->count();
        $overdueTotal  = (string) (clone $overdue)->get()->reduce(fn ($c, $i) => bcadd($c, $i->balanceDue(), 2), '0');
        $outstandingAr = (string) Invoice::unpaid()->get()->reduce(fn ($c, $i) => bcadd($c, $i->balanceDue(), 2), '0');

        $overdueList = Invoice::overdue()->orderBy('due_date')->take(8)->get()->map(fn ($i) => [
            'id'          => $i->id,
            'invoice_code'=> $i->invoice_code,
            'bill_to'     => $i->billToName(),
            'balance'     => $i->balanceDue(),
            'due_date'    => $i->due_date?->toDateString(),
            'days_overdue'=> $i->due_date ? max(0, (int) now()->diffInDays($i->due_date, false) * -1) : 0,
        ]);

        // ── Accounts Payable (unpaid vendor bills) ───────────────────────────
        $unpaidBills   = VendorBill::unpaid()->with('vendor')->get();
        $apTotal       = (string) $unpaidBills->reduce(fn ($c, $b) => bcadd($c, $b->balanceDue(), 2), '0');
        $apList        = $unpaidBills->sortBy('due_date')->take(8)->map(fn ($b) => [
            'id'        => $b->id,
            'bill_code' => $b->bill_code,
            'vendor'    => $b->vendor?->name,
            'balance'   => $b->balanceDue(),
            'due_date'  => $b->due_date?->toDateString(),
        ])->values();

        // ── Account balances ─────────────────────────────────────────────────
        $accounts = Account::all()->map(fn ($a) => [
            'name' => $a->name, 'type' => $a->type, 'balance' => $a->balance(),
        ]);
        $totalCash = (string) $accounts->reduce(fn ($c, $a) => bcadd($c, $a['balance'], 2), '0');

        return response()->json([
            'revenue_this_month' => $revenueThisMonth,
            'revenue_ytd'        => $revenueYtd,
            'expense_this_month' => $expenseThisMonth,
            'expense_ytd'        => $expenseYtd,
            'net_this_month'     => bcsub($revenueThisMonth, $expenseThisMonth, 2),
            'expense_by_category'=> $expenseByCategory,
            'outstanding_ar'     => $outstandingAr,
            'overdue_count'      => $overdueCount,
            'overdue_total'      => $overdueTotal,
            'overdue_invoices'   => $overdueList,
            'ap_outstanding'     => $apTotal,
            'ap_count'           => $unpaidBills->count(),
            'unpaid_vendor_bills'=> $apList,
            'account_balances'   => $accounts,
            'total_cash'         => $totalCash,
            'revenue_trend'      => $reports->revenueTrend(),
            'revenue_by_source'  => $reports->revenueBySource(),
        ]);
    }

    /** Operations-role dashboard: bookings, leases, tenants. */
    public function operations(): JsonResponse
    {
        $upcomingApproved = Booking::where('status', 'booking_approved')
            ->whereDate('booking_date', '>=', today())
            ->whereDate('booking_date', '<=', today()->addDays(7))->count();

        $activeLeases   = Lease::where('status', 'active')->count();
        $pendingLeases  = Lease::where('status', 'pending_approval')->count();
        $expiringLeases = Lease::active()->expiringSoon(10)->count();

        $expiringLeasesList = Lease::active()->expiringSoon(10)
            ->with(['tenant', 'space'])->get()
            ->sortBy('end_date')
            ->map(fn ($l) => [
                'id'         => $l->id,
                'lease_code' => $l->lease_code,
                'tenant_name'=> $l->tenant?->company_name,
                'space_name' => $l->space?->name,
                'end_date'   => $l->end_date?->toDateString(),
                'days_left'  => (int) now()->diffInDays($l->end_date, false),
            ])->values();

        $pendingLeaseApprovals = Lease::where('status', 'pending_approval')
            ->with(['tenant', 'space'])->latest()->take(6)->get()->map(fn ($l) => [
                'id'          => $l->id,
                'lease_code'  => $l->lease_code,
                'tenant_name' => $l->tenant?->company_name,
                'space_name'  => $l->space?->name,
                'rent'        => $l->billing_cycle === 'monthly' ? $l->monthly_rent : $l->semester_amount,
                'billing_cycle'=> $l->billing_cycle,
            ]);

        $activeTenants = Tenant::where('status', 'active')->count();
        $expiringDocs  = \App\Models\TenantDocument::expiringSoon(30)->count();
        $waitingList   = WaitingList::where('notified', false)->count();

        return response()->json([
            'upcoming_bookings'    => $upcomingApproved,
            'active_leases'        => $activeLeases,
            'pending_leases'       => $pendingLeases,
            'expiring_leases'      => $expiringLeases,
            'expiring_leases_list' => $expiringLeasesList,
            'pending_lease_approvals' => $pendingLeaseApprovals,
            'active_tenants'       => $activeTenants,
            'expiring_documents'   => $expiringDocs,
            'waiting_list'         => $waitingList,
        ]);
    }

    /** Redesigned single-page admin/super-admin dashboard data. */
    public function adminOverview(Request $request, ReportService $reports): JsonResponse
    {
        $range = in_array($request->input('range'), ['day', 'week', 'month', 'year'], true)
            ? $request->input('range') : 'month';

        return response()->json([
            'range'     => $range,
            'kpis'      => $this->overviewKpis($range, $reports),
            'calendar'  => $this->overviewCalendar(),
            'approvals' => $this->overviewApprovals(),
            'occupancy' => $this->overviewOccupancy($reports),
            'payments'  => $this->overviewPayments(),
            'waitlist'  => WaitingList::where('status', 'waiting')->count(),
        ]);
    }

    private function rangeBuckets(string $range): array
    {
        $n = now();
        return match ($range) {
            'day'  => ['period' => [$n->copy()->startOfDay(), $n->copy()->endOfDay()],
                       'prev'   => [$n->copy()->subDay()->startOfDay(), $n->copy()->subDay()->endOfDay()],
                       'buckets'=> collect(range(6, 0))->map(fn ($i) => [$n->copy()->subDays($i)->startOfDay(), $n->copy()->subDays($i)->endOfDay()])->all()],
            'week' => ['period' => [$n->copy()->startOfWeek(), $n->copy()->endOfWeek()],
                       'prev'   => [$n->copy()->subWeek()->startOfWeek(), $n->copy()->subWeek()->endOfWeek()],
                       'buckets'=> collect(range(7, 0))->map(fn ($i) => [$n->copy()->subWeeks($i)->startOfWeek(), $n->copy()->subWeeks($i)->endOfWeek()])->all()],
            'year' => ['period' => [$n->copy()->startOfYear(), $n->copy()->endOfYear()],
                       'prev'   => [$n->copy()->subYear()->startOfYear(), $n->copy()->subYear()->endOfYear()],
                       'buckets'=> collect(range(4, 0))->map(fn ($i) => [$n->copy()->subYears($i)->startOfYear(), $n->copy()->subYears($i)->endOfYear()])->all()],
            default=> ['period' => [$n->copy()->startOfMonth(), $n->copy()->endOfMonth()],
                       'prev'   => [$n->copy()->subMonth()->startOfMonth(), $n->copy()->subMonth()->endOfMonth()],
                       'buckets'=> collect(range(11, 0))->map(fn ($i) => [$n->copy()->subMonths($i)->startOfMonth(), $n->copy()->subMonths($i)->endOfMonth()])->all()],
        };
    }

    private function delta(float $cur, float $prev): array
    {
        if ($prev <= 0) return ['delta' => $cur > 0 ? '↑ new' : '—', 'tone' => $cur > 0 ? 'up' : 'flat'];
        $p = (int) round(($cur - $prev) / $prev * 100);
        if ($p > 0) return ['delta' => "↑ {$p}%", 'tone' => 'up'];
        if ($p < 0) return ['delta' => '↓ ' . abs($p) . '%', 'tone' => 'warn'];
        return ['delta' => '→ 0%', 'tone' => 'flat'];
    }

    private function overviewKpis(string $range, ReportService $reports): array
    {
        $b = $this->rangeBuckets($range);
        [$pf, $pt] = $b['period']; [$xf, $xt] = $b['prev'];
        $money = fn ($v) => '$' . number_format((float) $v, ($range === 'year' ? 0 : 2));

        $paySum = fn ($f, $t) => (float) Payment::where('type', 'customer_receipt')
            ->whereBetween('payment_date', [$f->toDateString(), $t->toDateString()])->sum('amount');
        $bookCount = fn ($f, $t) => Booking::whereBetween('booking_date', [$f->toDateString(), $t->toDateString()])
            ->whereNotIn('status', ['rejected', 'cancelled'])->count();
        $sessCount = fn ($f, $t) => Booking::whereIn('session_type', ['morning', 'afternoon', 'evening'])
            ->whereBetween('booking_date', [$f->toDateString(), $t->toDateString()])
            ->whereNotIn('status', ['rejected', 'cancelled'])->count();

        // Revenue
        $revSeries = array_map(fn ($bk) => round($paySum($bk[0], $bk[1]), 2), $b['buckets']);
        $revCur = $paySum($pf, $pt); $revPrev = $paySum($xf, $xt);

        // Bookings
        $bkSeries = array_map(fn ($bk) => $bookCount($bk[0], $bk[1]), $b['buckets']);
        $bkCur = $bookCount($pf, $pt); $bkPrev = $bookCount($xf, $xt);
        $pending = Booking::whereIn('status', ['admin_pending', 'accountant_pending'])->count();

        // Occupancy
        $occ = $reports->occupancyReport($pf->toDateString(), $pt->toDateString());
        $tBooked = collect($occ['rows'])->sum('booked'); $tCap = collect($occ['rows'])->sum('available');
        $occPct = $tCap > 0 ? (int) round($tBooked / $tCap * 100) : 0;

        // Tenants (cumulative)
        $tnSeries = array_map(fn ($bk) => Tenant::where('created_at', '<=', $bk[1])->count(), $b['buckets']);
        $tnNow = Tenant::where('status', 'active')->count();
        $tnNew = Tenant::whereBetween('created_at', [$pf, $pt])->count();

        // Sessions
        $ssSeries = array_map(fn ($bk) => $sessCount($bk[0], $bk[1]), $b['buckets']);
        $ssCur = $sessCount($pf, $pt); $ssPrev = $sessCount($xf, $xt);

        // Overdue invoices
        $overdue = Invoice::overdue();
        $odCount = (clone $overdue)->count();
        $odTotal = (clone $overdue)->get()->reduce(fn ($c, $i) => bcadd($c, $i->balanceDue(), 2), '0');
        $odSeries = array_map(fn ($bk) => Invoice::whereIn('status', ['sent', 'partial', 'overdue'])
            ->whereBetween('due_date', [$bk[0]->toDateString(), $bk[1]->toDateString()])->count(), $b['buckets']);

        // Total unpaid (outstanding AR) — snapshot, with a due-date trend
        $unpaidInvs = Invoice::unpaid()->get();
        $unpaidTotal = (float) $unpaidInvs->reduce(fn ($c, $i) => bcadd($c, $i->balanceDue(), 2), '0');
        $unpaidSeries = array_map(fn ($bk) => (float) $unpaidInvs
            ->filter(fn ($i) => $i->due_date && $i->due_date->betweenIncluded($bk[0], $bk[1]))
            ->reduce(fn ($c, $i) => bcadd($c, $i->balanceDue(), 2), '0'), $b['buckets']);

        return [
            'revenue'   => array_merge(['value' => $money($revCur), 'series' => $revSeries,
                'foot' => 'vs ' . $money($revPrev) . ' prev ' . $range], $this->delta($revCur, $revPrev)),
            'bookings'  => ['value' => (string) $bkCur, 'series' => $bkSeries,
                'delta' => $pending > 0 ? "{$pending} pending" : '↑ ' . $bkCur, 'tone' => $pending > 0 ? 'warn' : 'up',
                'foot' => $bkCur . ' in period · ' . $bkPrev . ' prev'],
            'occupancy' => ['value' => $occPct . '%', 'pct' => $occPct, 'series' => [],
                'foot' => $tBooked . ' of ' . $tCap . ' slots', ...$this->delta($occPct, 0)],
            'tenants'   => ['value' => (string) $tnNow, 'series' => $tnSeries,
                'delta' => $tnNew > 0 ? "↑ {$tnNew} new" : '—', 'tone' => $tnNew > 0 ? 'up' : 'flat',
                'foot' => $tnNow . ' active tenants'],
            'sessions'  => array_merge(['value' => (string) $ssCur, 'series' => $ssSeries,
                'foot' => 'Conference + halls'], $this->delta($ssCur, $ssPrev)),
            'overdue'   => ['value' => (string) $odCount, 'series' => $odSeries,
                'delta' => $odCount > 0 ? 'Action needed' : 'All clear', 'tone' => $odCount > 0 ? 'danger' : 'up',
                'foot' => '$' . number_format((float) $odTotal, 2) . ' outstanding'],
            'received'  => array_merge(['value' => $money($revCur), 'series' => $revSeries,
                'foot' => 'Received this ' . $range], $this->delta($revCur, $revPrev)),
            'unpaid'    => ['value' => $money($unpaidTotal), 'series' => $unpaidSeries,
                'delta' => $unpaidInvs->count() . ' invoice' . ($unpaidInvs->count() === 1 ? '' : 's'),
                'tone' => $unpaidTotal > 0 ? 'warn' : 'up', 'foot' => 'Outstanding receivables'],
        ];
    }

    private function overviewCalendar(): array
    {
        $cat = fn ($b) => in_array($b->session_type, ['morning', 'afternoon', 'evening']) ? $b->session_type : 'tenant';
        $days = [];
        foreach ([-1 => 'Yesterday', 0 => 'Today', 1 => 'Tomorrow'] as $offset => $short) {
            $date = now()->copy()->addDays($offset);
            $events = Booking::with('product')
                ->whereDate('booking_date', $date->toDateString())
                ->whereNotIn('status', ['rejected', 'cancelled'])
                ->orderBy('start_time')->get()
                ->map(fn ($b) => [
                    'start' => substr($b->start_time, 0, 5),
                    'end'   => $b->end_time ? substr($b->end_time, 0, 5) : null,
                    'title' => ucfirst($b->session_type) . ' · ' . ($b->product?->name ?? 'Space'),
                    'sub'   => $b->client_name,
                    'meta'  => '$' . number_format((float) $b->total_price, 2),
                    'cat'   => $cat($b),
                ])->values();
            $days[] = ['key' => $offset, 'label' => $date->format('D, j M Y'), 'short' => $short, 'events' => $events];
        }
        return $days;
    }

    private function overviewApprovals(): array
    {
        $ini = fn ($name) => strtoupper(substr(preg_replace('/[^A-Za-z ]/', '', $name), 0, 1) . (str_contains($name, ' ') ? substr(strrchr($name, ' '), 1, 1) : ''));
        $rows = collect();

        Booking::with('product')->whereIn('status', ['admin_pending', 'accountant_pending'])->latest()->take(6)->get()
            ->each(function ($b) use (&$rows, $ini) {
                $rows->push(['id' => $b->id, 'kind' => 'booking', 'status' => $b->status, 'ini' => $ini($b->client_name) ?: 'BK',
                    'name' => $b->client_name, 'space' => $b->product?->name ?? '—',
                    'date' => $b->booking_date?->format('j M Y'), 'type' => $b->session_type,
                    'ago' => $b->created_at?->diffForHumans(null, true) . ' ago', 'amount' => '$' . number_format((float) $b->total_price, 0)]);
            });

        Lease::with(['tenant', 'space'])->where('status', 'pending_approval')->latest()->take(4)->get()
            ->each(function ($l) use (&$rows, $ini) {
                $rows->push(['id' => $l->id, 'kind' => 'lease', 'ini' => $ini($l->tenant?->company_name ?? 'LS') ?: 'LS',
                    'name' => $l->tenant?->company_name ?? 'Lease', 'space' => $l->space?->name ?? '—',
                    'date' => $l->billing_cycle === 'monthly' ? 'Monthly' : 'Semester', 'type' => 'lease',
                    'ago' => $l->created_at?->diffForHumans(null, true) . ' ago',
                    'amount' => '$' . number_format((float) ($l->billing_cycle === 'monthly' ? $l->monthly_rent : $l->semester_amount), 0)]);
            });

        return $rows->values()->all();
    }

    private function overviewOccupancy(ReportService $reports): array
    {
        $occ  = $reports->occupancyReport(now()->startOfMonth()->toDateString(), now()->toDateString(), true);
        $rows = collect($occ['rows']);

        // Space-count occupancy: a space counts as occupied if it has any activity (rate > 0).
        // This keeps the headline gauge consistent with the Occupied / Available / Spaces tiles.
        $floors = $rows->groupBy(fn ($r) => $r['floor'] ?? 'Other')->map(function ($g, $floor) {
            $occN = $g->where('rate', '>', 0)->count(); $total = $g->count(); $avN = $total - $occN;
            $v = $total > 0 ? (int) round($occN / $total * 100) : 0;
            $note = $v >= 100
                ? 'Fully occupied'
                : ($g->contains(fn ($r) => $r['type'] === 'conference_hall')
                    ? 'Session-based'
                    : ($v === 0 ? 'Available for lease' : "{$occN} occupied · {$avN} available"));
            return ['name' => $floor, 'v' => $v, 'note' => $note];
        })->values();

        $occSpaces = $rows->where('rate', '>', 0)->count(); $totalSpaces = $rows->count();
        $overall = $totalSpaces > 0 ? (int) round($occSpaces / $totalSpaces * 100) : 0;

        // Month-over-month delta (percentage points), space-count based
        $last = $reports->occupancyReport(now()->subMonth()->startOfMonth()->toDateString(), now()->subMonth()->endOfMonth()->toDateString(), true);
        $lr = collect($last['rows']);
        $lastOverall = $lr->count() > 0 ? (int) round($lr->where('rate', '>', 0)->count() / $lr->count() * 100) : 0;
        $mom = $overall - $lastOverall;

        return [
            'overall'   => $overall,
            'occupied'  => $occSpaces,
            'available' => $totalSpaces - $occSpaces,
            'spaces'    => $totalSpaces,
            'mom'       => ($mom > 0 ? '↑ ' : ($mom < 0 ? '↓ ' : '→ ')) . abs($mom) . '% MoM',
            'mom_tone'  => $mom >= 0 ? 'up' : 'warn',
            'floors'    => $floors->all(),
        ];
    }

    private function overviewPayments(): array
    {
        $methodLabel = ['edahab' => 'Edahab', 'zaad' => 'ZAAD', 'bank_transfer' => 'Bank Transfer', 'cheque' => 'Cheque', 'cash' => 'Cash'];
        $rows = Payment::where('type', 'customer_receipt')
            ->with(['invoice.tenant', 'invoice.booking.product'])
            ->latest('payment_date')->latest('id')->take(5)->get()
            ->map(fn ($p) => [
                'tenant'  => $p->invoice?->billToName() ?? $p->invoice?->tenant?->company_name ?? 'Walk-in',
                'sub'     => $p->invoice?->booking?->product?->name ?? ucfirst(str_replace('_', ' ', (string) $p->invoice?->type)),
                'invoice' => $p->invoice?->invoice_code ?? '—',
                'method'  => $methodLabel[$p->payment_method] ?? ucfirst((string) $p->payment_method),
                'method_key' => $p->payment_method,
                'status'  => $p->invoice?->status ?? 'paid',
                'amount'  => (float) $p->amount,
                'date'    => $p->payment_date?->format('j M Y'),
            ]);

        return ['rows' => $rows->values()->all(), 'total' => (float) $rows->sum('amount')];
    }

    public function stats(ReportService $reports): JsonResponse
    {
        $user = Auth::user();

        // ── Phase 1 ──────────────────────────────────────────────────────────
        $totalStaff = User::where('status', 'active')->count();

        // ── Phase 2 ──────────────────────────────────────────────────────────
        $activeTenants    = Tenant::where('status', 'active')->count();
        $activeLeases     = Lease::where('status', 'active')->count();
        $pendingLeases    = Lease::where('status', 'pending_approval')->count();
        $expiringLeases   = Lease::active()->expiringSoon(10)->count();

        $adminPending     = Booking::where('status', 'admin_pending')->count();
        $financePending   = Booking::where('status', 'accountant_pending')->count();

        $upcomingApproved = Booking::where('status', 'booking_approved')
            ->whereDate('booking_date', '>=', today())
            ->whereDate('booking_date', '<=', today()->addDays(7))
            ->count();

        $waitingList      = WaitingList::where('notified', false)->count();

        // ── Phase 3b: Finance ────────────────────────────────────────────────
        $overdueInvoices = Invoice::overdue();
        $overdueCount    = (clone $overdueInvoices)->count();
        $overdueTotal    = (string) (clone $overdueInvoices)->get()->reduce(
            fn ($carry, $inv) => bcadd($carry, $inv->balanceDue(), 2), '0'
        );

        // Revenue this month = sum of payments received this calendar month
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd   = now()->endOfMonth()->toDateString();
        $revenueThisMonth = (string) Payment::where('type', 'customer_receipt')
            ->whereBetween('payment_date', [$monthStart, $monthEnd])
            ->sum('amount');

        $revenueYtd = (string) Payment::where('type', 'customer_receipt')
            ->whereYear('payment_date', now()->year)
            ->sum('amount');

        // Outstanding AR = unpaid invoice balances
        $outstandingAr = (string) Invoice::unpaid()->get()->reduce(
            fn ($carry, $inv) => bcadd($carry, $inv->balanceDue(), 2), '0'
        );

        // ── Recent bookings (last 6) ─────────────────────────────────────────
        $recentBookings = Booking::with('product')
            ->latest()
            ->take(6)
            ->get()
            ->map(fn ($b) => [
                'id'           => $b->id,
                'booking_code' => $b->booking_code,
                'client_name'  => $b->client_name,
                'product_name' => $b->product?->name,
                'booking_date' => $b->booking_date?->toDateString(),
                'session_type' => $b->session_type,
                'status'       => $b->status,
                'total_price'  => $b->total_price,
            ]);

        // ── Pending approval queues (for action widgets) ─────────────────────
        $pendingForAdmin = [];
        if ($user->hasPermissionTo('approve-booking')) {
            $pendingForAdmin = Booking::with('product')
                ->where('status', 'admin_pending')
                ->latest()
                ->take(5)
                ->get()
                ->map(fn ($b) => [
                    'id'           => $b->id,
                    'booking_code' => $b->booking_code,
                    'client_name'  => $b->client_name,
                    'product_name' => $b->product?->name,
                    'booking_date' => $b->booking_date?->toDateString(),
                    'session_type' => $b->session_type,
                    'total_price'  => $b->total_price,
                ]);
        }

        $pendingForFinance = [];
        if ($user->hasPermissionTo('finance-approve-booking')) {
            $pendingForFinance = Booking::with('product')
                ->where('status', 'accountant_pending')
                ->latest()
                ->take(5)
                ->get()
                ->map(fn ($b) => [
                    'id'           => $b->id,
                    'booking_code' => $b->booking_code,
                    'client_name'  => $b->client_name,
                    'product_name' => $b->product?->name,
                    'booking_date' => $b->booking_date?->toDateString(),
                    'session_type' => $b->session_type,
                    'total_price'  => $b->total_price,
                ]);
        }

        // ── Pending lease approvals (for users who can approve leases) ───────
        $pendingLeaseApprovals = [];
        if ($user->hasPermissionTo('manage-leases')) {
            $pendingLeaseApprovals = Lease::with(['tenant', 'space'])
                ->where('status', 'pending_approval')
                ->latest()
                ->take(5)
                ->get()
                ->map(fn ($l) => [
                    'id'           => $l->id,
                    'lease_code'   => $l->lease_code,
                    'tenant_name'  => $l->tenant?->company_name,
                    'space_name'   => $l->space?->name,
                    'rent'         => $l->billing_cycle === 'monthly' ? $l->monthly_rent : $l->semester_amount,
                    'billing_cycle'=> $l->billing_cycle,
                ]);
        }

        // ── Expiring leases list ─────────────────────────────────────────────
        $expiringLeasesList = [];
        if ($expiringLeases > 0) {
            $expiringLeasesList = Lease::active()
                ->expiringSoon(10)
                ->with(['tenant', 'space'])
                ->get()
                ->map(fn ($l) => [
                    'id'           => $l->id,
                    'lease_code'   => $l->lease_code,
                    'tenant_name'  => $l->tenant?->company_name,
                    'space_name'   => $l->space?->name,
                    'end_date'     => $l->end_date?->toDateString(),
                    'days_left'    => (int) now()->diffInDays($l->end_date, false),
                ]);
        }

        return response()->json([
            // KPIs
            'total_staff'            => $totalStaff,
            'active_tenants'         => $activeTenants,
            'active_leases'          => $activeLeases,
            'pending_leases'         => $pendingLeases,
            'expiring_leases'        => $expiringLeases,
            'bookings_admin_pending' => $adminPending,
            'bookings_finance_pending' => $financePending,
            'bookings_upcoming'      => $upcomingApproved,
            'waiting_list'           => $waitingList,
            // Finance KPIs
            'overdue_invoices_count' => $overdueCount,
            'overdue_invoices_total' => $overdueTotal,
            'revenue_this_month'     => $revenueThisMonth,
            'revenue_ytd'            => $revenueYtd,
            'outstanding_ar'         => $outstandingAr,
            // Trends
            'booking_trend'          => $reports->bookingTrend(30),
            // Lists
            'recent_bookings'        => $recentBookings,
            'pending_admin_approvals'   => $pendingForAdmin,
            'pending_finance_approvals' => $pendingForFinance,
            'pending_lease_approvals'   => $pendingLeaseApprovals,
            'expiring_leases_list'   => $expiringLeasesList,
        ]);
    }
}
