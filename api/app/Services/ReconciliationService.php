<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountTransaction;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Auto-reconciliation (B8): parse an uploaded ZAAD / Edahab / bank statement
 * (CSV or Excel) and match its rows against the account's recorded transactions
 * by amount + date (± tolerance). PDF is not parsed automatically.
 */
class ReconciliationService
{
    private const DATE_TOLERANCE_DAYS = 3;

    /** Parse a statement file into normalised rows: [date, amount, reference, description]. */
    public function parse(UploadedFile $file): array
    {
        $ext = strtolower($file->getClientOriginalExtension());

        if ($ext === 'pdf') {
            throw new \RuntimeException('PDF statements cannot be auto-parsed. Please upload a CSV or Excel export of the statement.');
        }

        $rows = $ext === 'csv'
            ? array_map('str_getcsv', file($file->getRealPath(), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES))
            : (Excel::toArray(new class {}, $file)[0] ?? []);

        if (empty($rows)) {
            throw new \RuntimeException('The file appears to be empty.');
        }

        // Find the header row and map columns by keyword.
        $headerIdx = 0; $map = [];
        foreach ($rows as $i => $r) {
            $lower = array_map(fn ($c) => strtolower(trim((string) $c)), $r);
            $joined = implode('|', $lower);
            if (str_contains($joined, 'date') && (str_contains($joined, 'amount') || str_contains($joined, 'debit') || str_contains($joined, 'credit'))) {
                $headerIdx = $i;
                foreach ($lower as $idx => $name) {
                    if ($name === '') continue;
                    if (str_contains($name, 'date')) $map['date'] ??= $idx;
                    elseif (str_contains($name, 'amount')) $map['amount'] ??= $idx;
                    elseif (str_contains($name, 'debit') || str_contains($name, 'out') || str_contains($name, 'withdraw')) $map['debit'] ??= $idx;
                    elseif (str_contains($name, 'credit') || str_contains($name, 'in') || str_contains($name, 'deposit')) $map['credit'] ??= $idx;
                    elseif (str_contains($name, 'ref') || str_contains($name, 'txn') || str_contains($name, 'transaction')) $map['ref'] ??= $idx;
                    elseif (str_contains($name, 'desc') || str_contains($name, 'narration') || str_contains($name, 'detail')) $map['desc'] ??= $idx;
                }
                break;
            }
        }

        if (!isset($map['date']) || (!isset($map['amount']) && !isset($map['debit']) && !isset($map['credit']))) {
            throw new \RuntimeException('Could not detect Date and Amount columns. Ensure the file has a header row with "Date" and "Amount" (or Debit/Credit).');
        }

        $out = [];
        foreach (array_slice($rows, $headerIdx + 1) as $r) {
            $rawDate = $r[$map['date']] ?? null;
            if (!$rawDate) continue;
            $ts = strtotime(str_replace('/', '-', (string) $rawDate));
            if (!$ts) continue;

            $amount = isset($map['amount'])
                ? (float) preg_replace('/[^0-9.\-]/', '', (string) ($r[$map['amount']] ?? '0'))
                : ((float) preg_replace('/[^0-9.\-]/', '', (string) ($r[$map['debit']] ?? '0'))
                    + (float) preg_replace('/[^0-9.\-]/', '', (string) ($r[$map['credit']] ?? '0')));

            if (abs($amount) < 0.005) continue;

            $out[] = [
                'date'        => date('Y-m-d', $ts),
                'amount'      => round(abs($amount), 2),
                'reference'   => isset($map['ref']) ? trim((string) ($r[$map['ref']] ?? '')) : '',
                'description' => isset($map['desc']) ? trim((string) ($r[$map['desc']] ?? '')) : '',
            ];
        }

        if (empty($out)) {
            throw new \RuntimeException('No valid statement rows found after the header.');
        }

        return $out;
    }

    /** Match statement rows against the account's transactions. */
    public function reconcile(Account $account, array $statementRows): array
    {
        $txns = AccountTransaction::where('account_id', $account->id)
            ->orderBy('transaction_date')->get()
            ->map(fn ($t) => ['id' => $t->id, 'date' => $t->transaction_date->toDateString(),
                'amount' => round((float) $t->amount, 2), 'desc' => $t->description, 'matched' => false]);

        $matched = []; $unmatchedStatement = [];

        foreach ($statementRows as $sr) {
            $hit = $txns->first(fn ($t) => !$t['matched']
                && abs($t['amount'] - $sr['amount']) < 0.005
                && abs(strtotime($t['date']) - strtotime($sr['date'])) <= self::DATE_TOLERANCE_DAYS * 86400);

            if ($hit) {
                $txns = $txns->map(fn ($t) => $t['id'] === $hit['id'] ? array_merge($t, ['matched' => true]) : $t);
                $matched[] = ['transaction_id' => $hit['id'], 'date' => $sr['date'], 'amount' => $sr['amount'],
                    'reference' => $sr['reference'], 'description' => $sr['description'] ?: $hit['desc']];
            } else {
                $unmatchedStatement[] = $sr;
            }
        }

        $unmatchedBook = $txns->where('matched', false)->values()->all();

        $statementTotal = array_sum(array_column($statementRows, 'amount'));

        return [
            'matched'              => $matched,
            'unmatched_statement'  => $unmatchedStatement,
            'unmatched_book'       => $unmatchedBook,
            'summary'              => [
                'statement_rows'   => count($statementRows),
                'matched_count'    => count($matched),
                'statement_total'  => round($statementTotal, 2),
                'book_balance'     => $account->balance(),
            ],
        ];
    }

    /** Mark the given account-transaction IDs reconciled. */
    public function confirm(Account $account, array $transactionIds): int
    {
        return AccountTransaction::where('account_id', $account->id)
            ->whereIn('id', $transactionIds)
            ->update(['reconciled' => true, 'reconciled_at' => now()]);
    }
}
