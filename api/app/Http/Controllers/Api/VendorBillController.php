<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VendorBill;
use App\Services\AuditService;
use App\Services\VendorBillService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VendorBillController extends Controller
{
    public function __construct(
        private VendorBillService $vendorBillService,
        private AuditService $auditService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = VendorBill::with('vendor')->withCount('items');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('vendor_id')) {
            $query->where('vendor_id', $request->input('vendor_id'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('bill_code', 'like', "%$search%");
        }

        $paginator = $query->latest('bill_date')->paginate(25);

        $paginator->getCollection()->transform(fn ($b) => [
            'id'           => $b->id,
            'bill_code'    => $b->bill_code,
            'vendor_name'  => $b->vendor?->name,
            'bill_date'    => $b->bill_date?->toDateString(),
            'due_date'     => $b->due_date?->toDateString(),
            'total_amount' => $b->total_amount,
            'amount_paid'  => $b->amountPaid(),
            'balance_due'  => $b->balanceDue(),
            'status'       => $b->status,
        ]);

        return response()->json($paginator);
    }

    public function store(Request $request): JsonResponse
    {
        // items arrive as a JSON string under multipart/form-data — decode before validating
        if (is_string($request->input('items'))) {
            $request->merge(['items' => json_decode($request->input('items'), true) ?? []]);
        }

        $request->validate([
            'vendor_id'             => 'required|exists:vendors,id',
            'po_id'                 => 'nullable|exists:purchase_orders,id',
            'bill_date'             => 'required|date',
            'due_date'              => 'nullable|date',
            'expense_account_id'    => 'nullable|exists:chart_of_accounts,id',
            'notes'                 => 'nullable|string',
            'receipt'               => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'items'                 => 'required|array|min:1',
            'items.*.description'   => 'required|string',
            'items.*.quantity'      => 'nullable|numeric|min:0.01',
            'items.*.unit_price'    => 'required|numeric|min:0',
            'items.*.expense_account_id' => 'nullable|exists:chart_of_accounts,id',
        ]);

        $bill = $this->vendorBillService->createBill($request->all(), Auth::user(), $request->file('receipt'));
        $this->auditService->log('created', VendorBill::class, (int) $bill->id, null, $bill->toArray());

        return response()->json($bill, 201);
    }

    public function show(VendorBill $vendorBill): JsonResponse
    {
        $vendorBill->load(['vendor', 'items.expenseAccount', 'payments.account', 'purchaseOrder', 'createdBy']);

        return response()->json(array_merge($vendorBill->toArray(), [
            'amount_paid' => $vendorBill->amountPaid(),
            'balance_due' => $vendorBill->balanceDue(),
        ]));
    }

    public function pay(Request $request, VendorBill $vendorBill): JsonResponse
    {
        $request->validate([
            'amount'           => 'required|numeric|min:0.01',
            'payment_date'     => 'required|date',
            'payment_method'   => 'required|in:edahab,zaad,bank_transfer,cheque,cash',
            'account_id'       => 'required|exists:accounts,id',
            'reference_number' => 'nullable|string|max:100',
            'notes'            => 'nullable|string',
        ]);

        try {
            $payment = $this->vendorBillService->payBill($vendorBill, $request->all(), Auth::user());
            $this->auditService->log('created', \App\Models\Payment::class, (int) $payment->id, null, $payment->toArray());

            return response()->json([
                'message' => 'Vendor bill payment recorded.',
                'payment' => $payment,
                'bill'    => [
                    'status'      => $vendorBill->fresh()->status,
                    'balance_due' => $vendorBill->fresh()->balanceDue(),
                ],
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }
}
