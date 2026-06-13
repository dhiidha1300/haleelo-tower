<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\AccountingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AccountController extends Controller
{
    public function __construct(private AccountingService $accountingService) {}

    public function index(): JsonResponse
    {
        $accounts = Account::with('chartOfAccount')->get()->map(fn ($a) => [
            'id'                 => $a->id,
            'name'               => $a->name,
            'type'               => $a->type,
            'account_identifier' => $a->account_identifier,
            'active'             => $a->active,
            'notes'              => $a->notes,
            'coa_code'           => $a->chartOfAccount?->code,
            'balance'            => $a->balance(),
        ]);

        $totalBalance = $accounts->reduce(fn ($carry, $a) => bcadd($carry, $a['balance'], 2), '0');

        return response()->json([
            'accounts'      => $accounts,
            'total_balance' => $totalBalance,
        ]);
    }

    public function transactions(Request $request, Account $account): JsonResponse
    {
        $query = $account->transactions()->with('journalEntry')->latest('transaction_date')->latest('id');

        if ($request->filled('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->input('date_to'));
        }

        $paginator = $query->paginate(50);

        // Compute a running balance per page (oldest-first within the displayed set)
        $paginator->getCollection()->transform(fn ($t) => [
            'id'               => $t->id,
            'type'             => $t->type,
            'amount'           => $t->amount,
            'description'      => $t->description,
            'reference_code'   => $t->reference_code,
            'transaction_date' => $t->transaction_date?->toDateString(),
            'journal_code'     => $t->journalEntry?->journal_code,
        ]);

        return response()->json([
            'account'  => [
                'id'      => $account->id,
                'name'    => $account->name,
                'balance' => $account->balance(),
            ],
            'transactions' => $paginator,
        ]);
    }

    /** Inter-account transfer receipt PDF (#152), rendered from the TRF journal entry. */
    public function transferReceipt(\App\Models\JournalEntry $journalEntry)
    {
        $journalEntry->load('lines.account', 'postedBy');

        $debit  = $journalEntry->lines->firstWhere('type', 'debit');   // money into destination
        $credit = $journalEntry->lines->firstWhere('type', 'credit');  // money out of source

        $building = [
            'name'    => \App\Models\SystemSetting::get('building_name', 'Haleelo Tower'),
            'address' => \App\Models\SystemSetting::get('address', 'Mogadishu, Somalia'),
        ];

        $rows = [
            'Reference No.' => $journalEntry->reference_code ?? $journalEntry->journal_code,
            'Journal Entry' => $journalEntry->journal_code,
            'Date'          => $journalEntry->entry_date->format('d M Y'),
            'From Account'  => $credit?->account?->name,
            'To Account'    => $debit?->account?->name,
            'Authorised By' => $journalEntry->postedBy?->name ?? 'System',
            'Description'   => $journalEntry->description,
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.voucher', [
            'title'       => 'TRANSFER RECEIPT',
            'code'        => $journalEntry->reference_code ?? $journalEntry->journal_code,
            'amount'      => $debit?->amount ?? 0,
            'amountLabel' => 'AMOUNT TRANSFERRED',
            'rows'        => $rows,
            'building'    => $building,
        ]);

        return response($pdf->output(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . ($journalEntry->reference_code ?? $journalEntry->journal_code) . '.pdf"',
        ]);
    }

    public function transfer(Request $request): JsonResponse
    {
        $request->validate([
            'source_account_id'      => 'required|exists:accounts,id',
            'destination_account_id' => 'required|exists:accounts,id|different:source_account_id',
            'amount'                 => 'required|numeric|min:0.01',
            'date'                   => 'required|date',
            'notes'                  => 'nullable|string',
        ]);

        $source      = Account::findOrFail($request->input('source_account_id'));
        $destination = Account::findOrFail($request->input('destination_account_id'));

        // Guard against overdrawing the source
        if (bccomp($source->balance(), (string) $request->input('amount'), 2) < 0) {
            return response()->json([
                'error'   => 'Validation Error',
                'message' => "Insufficient balance in {$source->name} (available: \${$source->balance()}).",
            ], 422);
        }

        try {
            $entry = $this->accountingService->transfer(
                $source,
                $destination,
                (string) $request->input('amount'),
                $request->input('date'),
                $request->input('notes'),
                Auth::user()
            );

            return response()->json([
                'message'          => 'Transfer completed.',
                'journal_code'     => $entry->journal_code,
                'journal_entry_id' => $entry->id,
                'reference'        => $entry->reference_code,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }
}
