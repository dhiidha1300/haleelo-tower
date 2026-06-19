<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\ChartOfAccount;
use App\Services\AccountingService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AccountController extends Controller
{
    public function __construct(
        private AccountingService $accountingService,
        private AuditService $auditService
    ) {}

    /** Asset-code ranges for each operating-account type (flat, like the seed). */
    private const CODE_RANGES = [
        'cash'         => [1001, 1009],
        'mobile_money' => [1010, 1019],
        'bank'         => [1020, 1029],
    ];

    /**
     * Create an operating account and auto-create its linked Chart-of-Accounts
     * asset sub-account with the next free code in that type's range.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'               => 'required|string|max:255',
            'type'               => 'required|in:cash,bank,mobile_money',
            'account_identifier' => 'nullable|string|max:100',
            'notes'              => 'nullable|string|max:1000',
        ]);

        $code = $this->nextCodeForType($data['type']);
        if ($code === null) {
            return response()->json([
                'message' => 'No free Chart-of-Accounts code remains for this account type. Contact an administrator.',
            ], 422);
        }

        $account = DB::transaction(function () use ($data, $code) {
            // 1) Create the COA asset entry (flat — no parent, not a system account).
            $coa = ChartOfAccount::create([
                'code'        => $code,
                'name'        => $data['name'],
                'type'        => 'asset',
                'parent_id'   => null,
                'description' => 'Operating account (' . str_replace('_', ' ', $data['type']) . ')',
                'active'      => true,
                'is_system'   => false,
            ]);

            // 2) Create the operating account linked to it.
            $acct = Account::create([
                'chart_of_account_id' => $coa->id,
                'name'                => $data['name'],
                'type'                => $data['type'],
                'account_identifier'  => $data['account_identifier'] ?? null,
                'active'              => true,
                'notes'               => $data['notes'] ?? null,
            ]);

            $this->auditService->log('created', Account::class, $acct->id, null, [
                'name' => $acct->name, 'type' => $acct->type, 'coa_code' => $code,
            ]);

            return $acct->load('chartOfAccount');
        });

        return response()->json([
            'id'                 => $account->id,
            'name'               => $account->name,
            'type'               => $account->type,
            'account_identifier' => $account->account_identifier,
            'active'             => $account->active,
            'notes'              => $account->notes,
            'coa_code'           => $account->chartOfAccount?->code,
            'balance'            => $account->balance(),
        ], 201);
    }

    /** Next free asset code within the type's range, or null if the range is full. */
    private function nextCodeForType(string $type): ?string
    {
        [$start, $end] = self::CODE_RANGES[$type];
        $taken = ChartOfAccount::whereBetween('code', [(string) $start, (string) $end])
            ->pluck('code')->all();

        for ($n = $start; $n <= $end; $n++) {
            if (!in_array((string) $n, $taken, true)) {
                return (string) $n;
            }
        }
        return null;
    }

    public function index(Request $request): JsonResponse
    {
        // Active-only by default (so selection dropdowns hide inactive accounts).
        // The management page passes ?all=1 to also see/reactivate inactive ones.
        $query = Account::with('chartOfAccount');
        if (!$request->boolean('all')) {
            $query->where('active', true);
        }

        $accounts = $query->get()->map(fn ($a) => $this->payload($a));

        $totalBalance = $accounts->reduce(fn ($carry, $a) => bcadd($carry, $a['balance'], 2), '0');

        return response()->json([
            'accounts'      => $accounts,
            'total_balance' => $totalBalance,
        ]);
    }

    /** Upload a ZAAD/Edahab/bank statement and auto-match it against this account. */
    public function reconcile(Request $request, Account $account, \App\Services\ReconciliationService $svc): JsonResponse
    {
        $request->validate(['statement' => 'required|file|mimes:csv,txt,xlsx,xls,pdf|max:10240']);
        try {
            $rows = $svc->parse($request->file('statement'));
            return response()->json($svc->reconcile($account, $rows));
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** Mark the matched transactions as reconciled. */
    public function reconcileConfirm(Request $request, Account $account, \App\Services\ReconciliationService $svc): JsonResponse
    {
        $data = $request->validate(['transaction_ids' => 'required|array', 'transaction_ids.*' => 'integer']);
        $count = $svc->confirm($account, $data['transaction_ids']);
        $this->auditService->log('updated', Account::class, $account->id, null, ['reconciled_transactions' => $count]);
        return response()->json(['message' => "{$count} transaction(s) marked reconciled."]);
    }

    private function payload(Account $a): array
    {
        return [
            'id'                 => $a->id,
            'name'               => $a->name,
            'type'               => $a->type,
            'account_identifier' => $a->account_identifier,
            'active'             => $a->active,
            'notes'              => $a->notes,
            'coa_code'           => $a->chartOfAccount?->code,
            'balance'            => $a->balance(),
        ];
    }

    /** Edit an account's name / number / notes. COA code is immutable here. */
    public function update(Request $request, Account $account): JsonResponse
    {
        $data = $request->validate([
            'name'               => 'sometimes|string|max:255',
            'account_identifier' => 'sometimes|nullable|string|max:100',
            'notes'              => 'sometimes|nullable|string|max:1000',
        ]);

        $old = $account->only(['name', 'account_identifier', 'notes']);
        $account->update($data);

        // Keep the linked Chart-of-Accounts entry name in sync with the account name.
        if (array_key_exists('name', $data) && $account->chart_of_account_id) {
            ChartOfAccount::where('id', $account->chart_of_account_id)->update(['name' => $data['name']]);
        }

        $this->auditService->log('updated', Account::class, $account->id, $old, $account->only(['name', 'account_identifier', 'notes']));

        return response()->json($this->payload($account->fresh('chartOfAccount')));
    }

    /**
     * Activate / deactivate an account. Deactivating an account that still holds a
     * balance first sweeps it to a chosen destination via a balanced transfer, so
     * the books stay balanced.
     */
    public function setActive(Request $request, Account $account): JsonResponse
    {
        $data = $request->validate([
            'active'                 => 'required|boolean',
            'destination_account_id' => 'nullable|exists:accounts,id|different:' . $account->id,
        ]);

        if ($data['active']) {
            $account->update(['active' => true]);
            $this->auditService->log('updated', Account::class, $account->id, ['active' => false], ['active' => true]);
            return response()->json($this->payload($account->fresh('chartOfAccount')));
        }

        // Deactivating — handle any remaining balance.
        $balance = $account->balance();
        if (bccomp($balance, '0', 2) > 0) {
            if (empty($data['destination_account_id'])) {
                return response()->json([
                    'message'         => 'This account holds a balance of $' . $balance . '. Choose a destination account to transfer it to before deactivating.',
                    'requires_sweep'  => true,
                    'balance'         => $balance,
                ], 422);
            }
            $destination = Account::findOrFail($data['destination_account_id']);
            $this->accountingService->transfer(
                $account, $destination, $balance, now()->toDateString(),
                'Balance sweep on deactivation of ' . $account->name, Auth::user()
            );
        } elseif (bccomp($balance, '0', 2) < 0) {
            return response()->json([
                'message' => 'This account has a negative balance of $' . $balance . '. Please resolve it manually before deactivating.',
            ], 422);
        }

        $account->update(['active' => false]);
        $this->auditService->log('updated', Account::class, $account->id, ['active' => true], ['active' => false, 'swept_to' => $data['destination_account_id'] ?? null]);

        return response()->json($this->payload($account->fresh('chartOfAccount')));
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
