<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\Vendor;
use App\Models\VendorBill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Global command-palette search. Permission-aware: only returns record
 * types the signed-in user is allowed to see.
 */
class SearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->input('q', ''));
        if (strlen($q) < 2) {
            return response()->json(['results' => []]);
        }

        $user    = Auth::user();
        $can     = fn (string $perm) => $user->hasPermissionTo($perm);
        $results = [];
        $like    = "%{$q}%";

        if ($can('view-bookings')) {
            foreach (Booking::where('booking_code', 'like', $like)->orWhere('client_name', 'like', $like)->limit(5)->get() as $b) {
                $results[] = ['type' => 'Booking', 'label' => $b->booking_code, 'sublabel' => $b->client_name, 'link' => "/dashboard/bookings/{$b->id}"];
            }
        }
        if ($can('manage-invoices') || $can('view-financial-reports')) {
            foreach (Invoice::where('invoice_code', 'like', $like)->orWhere('bill_to_name', 'like', $like)->limit(5)->get() as $i) {
                $results[] = ['type' => 'Invoice', 'label' => $i->invoice_code, 'sublabel' => $i->billToName(), 'link' => "/dashboard/finance/invoices/{$i->id}"];
            }
        }
        if ($can('manage-vendor-bills')) {
            foreach (VendorBill::where('bill_code', 'like', $like)->limit(5)->get() as $vb) {
                $results[] = ['type' => 'Vendor Bill', 'label' => $vb->bill_code, 'sublabel' => $vb->vendor?->name, 'link' => "/dashboard/procurement/vendor-bills/{$vb->id}"];
            }
        }
        if ($can('view-tenants') || $can('manage-tenants')) {
            foreach (Tenant::where('company_name', 'like', $like)->orWhere('email', 'like', $like)->limit(5)->get() as $t) {
                $results[] = ['type' => 'Tenant', 'label' => $t->company_name, 'sublabel' => $t->contact_person_name, 'link' => "/dashboard/tenants/{$t->id}"];
            }
        }
        if ($can('manage-vendors')) {
            foreach (Vendor::where('name', 'like', $like)->limit(5)->get() as $v) {
                $results[] = ['type' => 'Vendor', 'label' => $v->name, 'sublabel' => ucfirst(str_replace('_', ' ', $v->category)), 'link' => "/dashboard/procurement/vendors"];
            }
        }
        if ($can('manage-employees')) {
            foreach (Employee::where('full_name', 'like', $like)->orWhere('employee_code', 'like', $like)->limit(5)->get() as $e) {
                $results[] = ['type' => 'Employee', 'label' => $e->full_name, 'sublabel' => $e->employee_code, 'link' => "/dashboard/hr/employees/{$e->id}"];
            }
        }

        return response()->json(['results' => $results]);
    }
}
