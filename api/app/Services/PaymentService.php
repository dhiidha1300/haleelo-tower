<?php

namespace App\Services;

use App\Models\Account;
use App\Models\ChartOfAccount;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\SecurityDeposit;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function __construct(
        private ReferenceCodeService $refService,
        private AccountingService $accountingService
    ) {}

    private function coaId(string $code): ?int
    {
        return ChartOfAccount::where('code', $code)->value('id');
    }

    /**
     * Record a customer receipt against an invoice.
     * Posts: Debit receiving account's COA (money in), Credit Accounts Receivable.
     */
    public function recordCustomerReceipt(Invoice $invoice, array $data, User $user): Payment
    {
        $amount  = (string) $data['amount'];
        $balance = $invoice->balanceDue();

        if (bccomp($amount, '0', 2) <= 0) {
            throw new \InvalidArgumentException('Payment amount must be greater than zero.');
        }
        if (bccomp($amount, $balance, 2) > 0) {
            throw new \InvalidArgumentException("Payment (\${$amount}) exceeds the outstanding balance (\${$balance}).");
        }

        return DB::transaction(function () use ($invoice, $data, $amount, $user) {
            $account = Account::findOrFail($data['account_id']);

            // AR account for this invoice type
            $arCode = $invoice->type === 'conference_hall' ? '1101' : '1100';

            $entry = $this->accountingService->postJournalEntry(
                $data['payment_date'],
                "Receipt for invoice {$invoice->invoice_code} from {$invoice->billToName()}",
                [
                    ['account_id' => $account->chart_of_account_id, 'type' => 'debit',  'amount' => $amount, 'description' => "Receipt into {$account->name}"],
                    ['account_id' => $this->coaId($arCode),         'type' => 'credit', 'amount' => $amount, 'description' => "Clear AR — {$invoice->invoice_code}"],
                ],
                'auto',
                $invoice->invoice_code,
                $user
            );

            $payment = Payment::create([
                'payment_code'     => $this->refService->generate('RCP'),
                'type'             => 'customer_receipt',
                'invoice_id'       => $invoice->id,
                'amount'           => $amount,
                'payment_date'     => $data['payment_date'],
                'payment_method'   => $data['payment_method'],
                'account_id'       => $account->id,
                'reference_number' => $data['reference_number'] ?? null,
                'notes'            => $data['notes'] ?? null,
                'journal_entry_id' => $entry->id,
                'created_by'       => $user->id,
            ]);

            // Update invoice status
            $newPaid = bcadd($invoice->amountPaid(), '0', 2); // amountPaid() already includes this payment now
            if (bccomp($newPaid, (string) $invoice->total_amount, 2) >= 0) {
                $invoice->update(['status' => 'paid']);
            } else {
                $invoice->update(['status' => 'partial']);
            }

            return $payment;
        });
    }

    /**
     * Record receipt of a security deposit into the books.
     * Posts: Debit receiving account's COA (cash in), Credit Security Deposits Owed (2100).
     */
    public function recordDepositReceipt(SecurityDeposit $deposit, array $data, User $user): SecurityDeposit
    {
        if ($deposit->received_journal_id) {
            throw new \InvalidArgumentException('This deposit receipt has already been recorded in the books.');
        }

        return DB::transaction(function () use ($deposit, $data, $user) {
            $account = Account::findOrFail($data['account_id']);

            $entry = $this->accountingService->postJournalEntry(
                $data['date'],
                "Security deposit received — tenant #{$deposit->tenant_id}",
                [
                    ['account_id' => $account->chart_of_account_id, 'type' => 'debit',  'amount' => $deposit->amount, 'description' => "Deposit into {$account->name}"],
                    ['account_id' => $this->coaId('2100'),          'type' => 'credit', 'amount' => $deposit->amount, 'description' => 'Security deposit liability'],
                ],
                'auto',
                null,
                $user
            );

            $deposit->update([
                'status'              => 'held',
                'received_date'       => $data['date'],
                'received_journal_id' => $entry->id,
            ]);

            return $deposit->fresh();
        });
    }

    /**
     * Return a tenant's security deposit.
     * Posts: Debit Security Deposits Owed (2100), Credit paying account's COA.
     */
    public function returnSecurityDeposit(SecurityDeposit $deposit, array $data, User $user): SecurityDeposit
    {
        if ($deposit->status === 'returned') {
            throw new \InvalidArgumentException('This deposit has already been returned.');
        }

        return DB::transaction(function () use ($deposit, $data, $user) {
            $account = Account::findOrFail($data['account_id']);

            if (bccomp($account->balance(), (string) $deposit->amount, 2) < 0) {
                throw new \InvalidArgumentException("Insufficient balance in {$account->name} to refund the deposit.");
            }

            $entry = $this->accountingService->postJournalEntry(
                $data['date'],
                "Security deposit return to tenant #{$deposit->tenant_id}",
                [
                    ['account_id' => $this->coaId('2100'),         'type' => 'debit',  'amount' => $deposit->amount, 'description' => 'Release security deposit liability'],
                    ['account_id' => $account->chart_of_account_id, 'type' => 'credit', 'amount' => $deposit->amount, 'description' => "Deposit refund from {$account->name}"],
                ],
                'auto',
                null,
                $user
            );

            $deposit->update([
                'status'            => 'returned',
                'returned_date'     => $data['date'],
                'return_journal_id' => $entry->id,
                'notes'             => $data['notes'] ?? $deposit->notes,
            ]);

            return $deposit->fresh();
        });
    }
}
