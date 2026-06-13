<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ExpenseService
{
    public function __construct(
        private ReferenceCodeService $refService,
        private AccountingService $accountingService
    ) {}

    /**
     * Record a direct expense and auto-post its journal entry.
     * Posts: Debit expense_account, Credit payment_account's COA (money out).
     */
    public function recordExpense(array $data, User $user, ?UploadedFile $receipt = null): Expense
    {
        return DB::transaction(function () use ($data, $user, $receipt) {
            $paymentAccount = Account::findOrFail($data['payment_account_id']);

            $receiptUrl = null;
            if ($receipt) {
                $path = $receipt->store('expenses/receipts', 'public');
                $receiptUrl = Storage::disk('public')->url($path);
            }

            $entry = $this->accountingService->postJournalEntry(
                $data['expense_date'],
                'Expense: ' . $data['description'],
                [
                    ['account_id' => $data['expense_account_id'],          'type' => 'debit',  'amount' => $data['amount'], 'description' => $data['description']],
                    ['account_id' => $paymentAccount->chart_of_account_id, 'type' => 'credit', 'amount' => $data['amount'], 'description' => "Paid from {$paymentAccount->name}"],
                ],
                'auto',
                null,
                $user
            );

            $expense = Expense::create([
                'expense_code'       => $this->refService->generate('EXP'),
                'description'        => $data['description'],
                'amount'             => $data['amount'],
                'expense_date'       => $data['expense_date'],
                'expense_account_id' => $data['expense_account_id'],
                'payment_account_id' => $paymentAccount->id,
                'booking_id'         => $data['booking_id'] ?? null,
                'receipt_file_url'   => $receiptUrl,
                'journal_entry_id'   => $entry->id,
                'created_by'         => $user->id,
            ]);

            // backfill the reference code on the journal now that we have the EXP code
            $entry->update(['reference_code' => $expense->expense_code]);

            return $expense->load(['expenseAccount', 'paymentAccount', 'booking']);
        });
    }
}
