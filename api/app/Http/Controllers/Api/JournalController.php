<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Services\AccountingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class JournalController extends Controller
{
    public function __construct(private AccountingService $accountingService) {}

    public function index(Request $request): JsonResponse
    {
        $query = JournalEntry::with(['lines.account', 'postedBy'])->latest('entry_date')->latest('id');

        if ($request->filled('source')) {
            $query->where('source', $request->input('source'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('entry_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('entry_date', '<=', $request->input('date_to'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('journal_code', 'like', "%$search%")
                  ->orWhere('description', 'like', "%$search%")
                  ->orWhere('reference_code', 'like', "%$search%");
            });
        }

        $paginator = $query->paginate(25);

        $paginator->getCollection()->transform(fn ($e) => [
            'id'             => $e->id,
            'journal_code'   => $e->journal_code,
            'entry_date'     => $e->entry_date?->toDateString(),
            'description'    => $e->description,
            'reference_code' => $e->reference_code,
            'source'         => $e->source,
            'posted_by'      => $e->postedBy?->name,
            'total'          => (string) $e->lines->where('type', 'debit')->sum('amount'),
            'lines'          => $e->lines->map(fn ($l) => [
                'account_code' => $l->account?->code,
                'account_name' => $l->account?->name,
                'type'         => $l->type,
                'amount'       => $l->amount,
                'description'  => $l->description,
            ])->values(),
        ]);

        return response()->json($paginator);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'entry_date'        => 'required|date',
            'description'       => 'required|string|max:255',
            'lines'             => 'required|array|min:2',
            'lines.*.account_id'=> 'required|exists:chart_of_accounts,id',
            'lines.*.type'      => 'required|in:debit,credit',
            'lines.*.amount'    => 'required|numeric|min:0.01',
            'lines.*.description' => 'nullable|string',
        ]);

        try {
            $entry = $this->accountingService->postJournalEntry(
                $request->input('entry_date'),
                $request->input('description'),
                $request->input('lines'),
                'manual',
                $request->input('reference_code'),
                Auth::user()
            );

            return response()->json($entry->load('lines.account'), 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function show(JournalEntry $journalEntry): JsonResponse
    {
        $journalEntry->load(['lines.account', 'postedBy']);
        return response()->json($journalEntry);
    }

    public function trialBalance(Request $request): JsonResponse
    {
        return response()->json(
            $this->accountingService->trialBalance($request->input('as_of'))
        );
    }
}
