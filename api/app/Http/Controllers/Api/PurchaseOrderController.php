<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Services\ReferenceCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    public function __construct(private ReferenceCodeService $refService) {}

    public function index(Request $request): JsonResponse
    {
        $query = PurchaseOrder::with('vendor')->withCount('items');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('vendor_id')) {
            $query->where('vendor_id', $request->input('vendor_id'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('po_code', 'like', "%$search%");
        }

        return response()->json($query->latest()->paginate(25));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'vendor_id'              => 'required|exists:vendors,id',
            'order_date'             => 'required|date',
            'expected_delivery_date' => 'nullable|date',
            'notes'                  => 'nullable|string',
            'items'                  => 'required|array|min:1',
            'items.*.description'    => 'required|string',
            'items.*.quantity'       => 'nullable|numeric|min:0.01',
            'items.*.estimated_unit_price' => 'required|numeric|min:0',
            'items.*.expense_account_id'   => 'nullable|exists:chart_of_accounts,id',
        ]);

        $po = DB::transaction(function () use ($request) {
            $total = collect($request->input('items'))->reduce(
                fn ($carry, $i) => bcadd($carry, bcmul((string) ($i['quantity'] ?? 1), (string) $i['estimated_unit_price'], 2), 2),
                '0'
            );

            $po = PurchaseOrder::create([
                'po_code'                => $this->refService->generate('PO'),
                'vendor_id'              => $request->input('vendor_id'),
                'order_date'             => $request->input('order_date'),
                'expected_delivery_date' => $request->input('expected_delivery_date'),
                'status'                 => 'draft',
                'total_estimated_amount' => $total,
                'notes'                  => $request->input('notes'),
                'created_by'             => Auth::id(),
            ]);

            foreach ($request->input('items') as $item) {
                $qty = $item['quantity'] ?? 1;
                PurchaseOrderItem::create([
                    'po_id'                => $po->id,
                    'description'          => $item['description'],
                    'quantity'             => $qty,
                    'estimated_unit_price' => $item['estimated_unit_price'],
                    'line_total'           => bcmul((string) $qty, (string) $item['estimated_unit_price'], 2),
                    'expense_account_id'   => $item['expense_account_id'] ?? null,
                ]);
            }

            return $po;
        });

        return response()->json($po->load(['vendor', 'items']), 201);
    }

    public function show(PurchaseOrder $purchaseOrder): JsonResponse
    {
        return response()->json($purchaseOrder->load(['vendor', 'items.expenseAccount', 'bills', 'createdBy']));
    }

    public function updateStatus(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $request->validate(['status' => 'required|in:draft,sent,received,billed,cancelled']);

        $allowed = [
            'draft'    => ['sent', 'cancelled'],
            'sent'     => ['received', 'cancelled'],
            'received' => ['billed', 'cancelled'],
        ];

        $current = $purchaseOrder->status;
        $new     = $request->input('status');

        if (!isset($allowed[$current]) || !in_array($new, $allowed[$current])) {
            return response()->json(['error' => 'Validation Error', 'message' => "Cannot move PO from '{$current}' to '{$new}'."], 422);
        }

        $purchaseOrder->update(['status' => $new]);

        return response()->json($purchaseOrder->fresh());
    }
}
