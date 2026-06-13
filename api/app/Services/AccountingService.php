<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * The single entry point for all journal-entry posting in the platform.
 * Every financial event (invoice, payment, expense, transfer, payroll)
 * MUST post through here. Never create journal entries directly elsewhere.
 */
class AccountingService
{
    public function __construct(private ReferenceCodeService $refService) {}

    /**
     * Post a balanced journal entry.
     *
     * @param  array  $lines  each: ['account_id' => int(COA), 'type' => 'debit'|'credit', 'amount' => numeric, 'description' => ?string]
     * @throws \InvalidArgumentException when debits != credits or fewer than 2 lines
     */
    public function postJournalEntry(
        string $entryDate,
        string $description,
        array $lines,
        string $source = 'manual',
        ?string $referenceCode = null,
        ?User $postedBy = null
    ): JournalEntry {
        $this->validateLines($lines);

        return DB::transaction(function () use ($entryDate, $description, $lines, $source, $referenceCode, $postedBy) {
            $entry = JournalEntry::create([
                'journal_code'      => $this->refService->generate('JE'),
                'entry_date'        => $entryDate,
                'description'       => $description,
                'reference_code'    => $referenceCode,
                'source'            => $source,
                'posted_by_user_id' => $postedBy?->id,
            ]);

            foreach ($lines as $line) {
                JournalEntryLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_id'       => $line['account_id'],
                    'type'             => $line['type'],
                    'amount'           => $line['amount'],
                    'description'      => $line['description'] ?? null,
                ]);

                // If this COA account is one of the 5 tracked operating accounts,
                // also record an account_transaction so balances stay live.
                $operating = Account::where('chart_of_account_id', $line['account_id'])->first();
                if ($operating) {
                    AccountTransaction::create([
                        'account_id'       => $operating->id,
                        'type'             => $line['type'], // debit/credit mirrors the journal line
                        'amount'           => $line['amount'],
                        'description'      => $line['description'] ?? $description,
                        'reference_code'   => $referenceCode,
                        'journal_entry_id' => $entry->id,
                        'transaction_date' => $entryDate,
                        'created_by'       => $postedBy?->id,
                    ]);
                }
            }

            return $entry->load('lines.account');
        });
    }

    /**
     * Inter-account transfer between two operating accounts.
     * Debits the destination COA, credits the source COA (money moves out of source).
     */
    public function transfer(Account $source, Account $destination, string $amount, string $date, ?string $notes, User $user): JournalEntry
    {
        if (!$source->active || !$destination->active) {
            throw new \InvalidArgumentException('Cannot transfer to or from an inactive account.');
        }
        if ($source->id === $destination->id) {
            throw new \InvalidArgumentException('Source and destination must be different accounts.');
        }
        if (bccomp($amount, '0', 2) <= 0) {
            throw new \InvalidArgumentException('Transfer amount must be greater than zero.');
        }

        $transferCode = $this->refService->generate('TRF');

        return $this->postJournalEntry(
            $date,
            "Inter-account transfer: {$source->name} → {$destination->name}" . ($notes ? " ({$notes})" : ''),
            [
                ['account_id' => $destination->chart_of_account_id, 'type' => 'debit',  'amount' => $amount, 'description' => "Transfer in ({$transferCode})"],
                ['account_id' => $source->chart_of_account_id,      'type' => 'credit', 'amount' => $amount, 'description' => "Transfer out ({$transferCode})"],
            ],
            'auto',
            $transferCode,
            $user
        );
    }

    /**
     * Trial balance: every account with non-zero activity, its debit/credit totals,
     * and a validation flag that total debits == total credits.
     */
    public function trialBalance(?string $asOfDate = null): array
    {
        $accounts = ChartOfAccount::orderBy('code')->get();

        $rows         = [];
        $totalDebit   = '0';
        $totalCredit  = '0';

        foreach ($accounts as $account) {
            $linesQuery = JournalEntryLine::where('account_id', $account->id)
                ->when($asOfDate, fn ($q) => $q->whereHas('journalEntry', fn ($e) => $e->whereDate('entry_date', '<=', $asOfDate)));

            $debit  = (string) ((clone $linesQuery)->where('type', 'debit')->sum('amount'));
            $credit = (string) ((clone $linesQuery)->where('type', 'credit')->sum('amount'));

            if (bccomp($debit, '0', 2) === 0 && bccomp($credit, '0', 2) === 0) {
                continue; // skip accounts with no activity
            }

            // Net into a single debit or credit column based on account normal balance
            $isDebitNormal = in_array($account->type, ['asset', 'expense']);
            $net = $isDebitNormal ? bcsub($debit, $credit, 2) : bcsub($credit, $debit, 2);

            $debitCol  = '0';
            $creditCol = '0';
            if ($isDebitNormal) {
                if (bccomp($net, '0', 2) >= 0) $debitCol = $net; else $creditCol = bcmul($net, '-1', 2);
            } else {
                if (bccomp($net, '0', 2) >= 0) $creditCol = $net; else $debitCol = bcmul($net, '-1', 2);
            }

            $totalDebit  = bcadd($totalDebit, $debitCol, 2);
            $totalCredit = bcadd($totalCredit, $creditCol, 2);

            $rows[] = [
                'code'   => $account->code,
                'name'   => $account->name,
                'type'   => $account->type,
                'debit'  => $debitCol,
                'credit' => $creditCol,
            ];
        }

        return [
            'rows'         => $rows,
            'total_debit'  => $totalDebit,
            'total_credit' => $totalCredit,
            'balanced'     => bccomp($totalDebit, $totalCredit, 2) === 0,
            'as_of'        => $asOfDate ?? now()->toDateString(),
        ];
    }

    private function validateLines(array $lines): void
    {
        if (count($lines) < 2) {
            throw new \InvalidArgumentException('A journal entry needs at least two lines (one debit, one credit).');
        }

        $debits  = '0';
        $credits = '0';

        foreach ($lines as $line) {
            if (!isset($line['account_id'], $line['type'], $line['amount'])) {
                throw new \InvalidArgumentException('Each journal line needs account_id, type, and amount.');
            }
            if (!in_array($line['type'], ['debit', 'credit'])) {
                throw new \InvalidArgumentException("Line type must be 'debit' or 'credit'.");
            }
            if (bccomp((string) $line['amount'], '0', 2) <= 0) {
                throw new \InvalidArgumentException('Each journal line amount must be greater than zero.');
            }

            if ($line['type'] === 'debit') {
                $debits = bcadd($debits, (string) $line['amount'], 2);
            } else {
                $credits = bcadd($credits, (string) $line['amount'], 2);
            }
        }

        if (bccomp($debits, $credits, 2) !== 0) {
            throw new \InvalidArgumentException("Unbalanced journal entry: debits ({$debits}) ≠ credits ({$credits}).");
        }
    }
}
