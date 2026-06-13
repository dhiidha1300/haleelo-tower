<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Services\AuditService;
use App\Services\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ExpenseController extends Controller
{
    public function __construct(
        private ExpenseService $expenseService,
        private AuditService $auditService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Expense::with(['expenseAccount', 'paymentAccount', 'booking']);

        if ($request->filled('booking_id')) {
            $query->where('booking_id', $request->input('booking_id'));
        }
        if ($request->filled('account_id')) {
            $query->where('expense_account_id', $request->input('account_id'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('expense_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('expense_date', '<=', $request->input('date_to'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(fn ($q) => $q->where('expense_code', 'like', "%$search%")->orWhere('description', 'like', "%$search%"));
        }

        $paginator = $query->latest('expense_date')->latest('id')->paginate(25);

        $paginator->getCollection()->transform(fn ($e) => [
            'id'             => $e->id,
            'expense_code'   => $e->expense_code,
            'description'    => $e->description,
            'amount'         => $e->amount,
            'expense_date'   => $e->expense_date?->toDateString(),
            'expense_account'=> $e->expenseAccount?->name,
            'payment_account'=> $e->paymentAccount?->name,
            'booking_code'   => $e->booking?->booking_code,
            'receipt_file_url'=> $e->receipt_file_url,
        ]);

        return response()->json($paginator);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'description'        => 'required|string|max:255',
            'amount'             => 'required|numeric|min:0.01',
            'expense_date'       => 'required|date',
            'expense_account_id' => 'required|exists:chart_of_accounts,id',
            'payment_account_id' => 'required|exists:accounts,id',
            'booking_id'         => 'nullable|exists:bookings,id',
            'receipt'            => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        try {
            $expense = $this->expenseService->recordExpense(
                $request->all(),
                Auth::user(),
                $request->file('receipt')
            );
            $this->auditService->log('created', Expense::class, (int) $expense->id, null, $expense->toArray());

            return response()->json($expense, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function show(Expense $expense): JsonResponse
    {
        return response()->json($expense->load(['expenseAccount', 'paymentAccount', 'booking', 'createdBy']));
    }
}
