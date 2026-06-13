<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Lease;
use App\Models\LeaveRequest;
use App\Models\TenantDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * Derived staff alerts — computed on demand from live data so they are
 * always accurate. Each item is something the signed-in user can act on.
 */
class NotificationController extends Controller
{
    public function index(): JsonResponse
    {
        $user  = Auth::user();
        $items = collect();

        $can = fn (string $perm) => $user->hasPermissionTo($perm);

        // Bookings awaiting Admin approval
        if ($can('approve-booking')) {
            foreach (Booking::where('status', 'admin_pending')->latest()->limit(20)->get() as $b) {
                $items->push($this->item('booking', 'high', "Booking {$b->booking_code} needs admin approval",
                    "{$b->client_name} · {$b->booking_date?->toDateString()}", "/dashboard/bookings/{$b->id}"));
            }
        }
        // Bookings awaiting Finance final approval
        if ($can('finance-approve-booking')) {
            foreach (Booking::where('status', 'accountant_pending')->latest()->limit(20)->get() as $b) {
                $items->push($this->item('booking', 'high', "Booking {$b->booking_code} needs finance approval",
                    "{$b->client_name} · \${$b->total_price}", "/dashboard/bookings/{$b->id}"));
            }
        }
        // Leases awaiting approval
        if ($can('manage-leases')) {
            foreach (Lease::where('status', 'pending_approval')->with('tenant')->latest()->limit(20)->get() as $l) {
                $items->push($this->item('lease', 'high', "Lease {$l->lease_code} awaiting approval",
                    $l->tenant?->company_name, "/dashboard/leases/{$l->id}"));
            }
        }
        // Pending leave requests
        if ($can('manage-leave-requests')) {
            foreach (LeaveRequest::where('status', 'pending')->with('employee')->latest()->limit(20)->get() as $lr) {
                $items->push($this->item('leave', 'medium', "Leave request — {$lr->employee?->full_name}",
                    "{$lr->leave_type} · {$lr->days_count} day(s)", "/dashboard/hr/leave/{$lr->id}"));
            }
        }
        // Overdue invoices
        if ($can('manage-invoices') || $can('view-financial-reports')) {
            foreach (Invoice::overdue()->latest('due_date')->limit(20)->get() as $inv) {
                $items->push($this->item('invoice', 'high', "Invoice {$inv->invoice_code} overdue",
                    "{$inv->billToName()} · \${$inv->balanceDue()}", "/dashboard/finance/invoices/{$inv->id}"));
            }
        }
        // Leases expiring within 10 days
        if ($can('view-leases') || $can('manage-leases')) {
            foreach (Lease::active()->expiringSoon(10)->with(['tenant', 'space'])->get() as $l) {
                $days = (int) now()->diffInDays($l->end_date, false);
                $items->push($this->item('lease', 'medium', "Lease {$l->lease_code} expires in {$days}d",
                    "{$l->tenant?->company_name} · {$l->space?->name}", "/dashboard/leases/{$l->id}"));
            }
        }
        // Tenant documents expiring within 30 days
        if ($can('manage-tenant-documents') || $can('view-tenants')) {
            foreach (TenantDocument::expiringSoon(30)->with('tenant')->get() as $d) {
                $days = (int) now()->diffInDays($d->expiry_date, false);
                $items->push($this->item('document', 'medium', "Document expiring in {$days}d",
                    ($d->tenant?->company_name ?? '') . " · " . str_replace('_', ' ', $d->document_type),
                    "/dashboard/tenants/{$d->tenant_id}"));
            }
        }

        return response()->json([
            'count' => $items->count(),
            'items' => $items->values(),
        ]);
    }

    private function item(string $type, string $severity, string $title, ?string $subtitle, string $link): array
    {
        return compact('type', 'severity', 'title', 'subtitle', 'link');
    }
}
