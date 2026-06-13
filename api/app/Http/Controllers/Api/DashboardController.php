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
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
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

    public function stats(): JsonResponse
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
            // Lists
            'recent_bookings'        => $recentBookings,
            'pending_admin_approvals'   => $pendingForAdmin,
            'pending_finance_approvals' => $pendingForFinance,
            'pending_lease_approvals'   => $pendingLeaseApprovals,
            'expiring_leases_list'   => $expiringLeasesList,
        ]);
    }
}
