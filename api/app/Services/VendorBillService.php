<?php

namespace App\Services;

use App\Models\Account;
use App\Models\ChartOfAccount;
use App\Models\Payment;
use App\Models\VendorBill;
use App\Models\VendorBillItem;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class VendorBillService
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
     * Create a vendor bill (a payable) and post its journal:
     * Debit expense account(s), Credit Accounts Payable (2001).
     */
    public function createBill(array $data, User $user, ?UploadedFile $receipt = null): VendorBill
    {
        return DB::transaction(function () use ($data, $user, $receipt) {
            $receiptUrl = null;
            if ($receipt) {
                $path = $receipt->store('vendor-bills/receipts', 'public');
                $receiptUrl = Storage::disk('public')->url($path);
            }

            $total = collect($data['items'])->reduce(
                fn ($carry, $i) => bcadd($carry, bcmul((string) ($i['quantity'] ?? 1), (string) $i['unit_price'], 2), 2),
                '0'
            );

            $bill = VendorBill::create([
                'bill_code'          => $this->refService->generate('VB'),
                'vendor_id'          => $data['vendor_id'],
                'po_id'              => $data['po_id'] ?? null,
                'bill_date'          => $data['bill_date'],
                'due_date'           => $data['due_date'] ?? null,
                'status'             => 'unpaid',
                'total_amount'       => $total,
                'expense_account_id' => $data['expense_account_id'] ?? null,
                'receipt_file_url'   => $receiptUrl,
                'notes'              => $data['notes'] ?? null,
                'created_by'         => $user->id,
            ]);

            $journalLines = [];
            foreach ($data['items'] as $item) {
                $qty       = $item['quantity'] ?? 1;
                $lineTotal = bcmul((string) $qty, (string) $item['unit_price'], 2);
                $acctId    = $item['expense_account_id'] ?? $data['expense_account_id'] ?? $this->coaId('4080');

                VendorBillItem::create([
                    'bill_id'            => $bill->id,
                    'description'        => $item['description'],
                    'quantity'           => $qty,
                    'unit_price'         => $item['unit_price'],
                    'line_total'         => $lineTotal,
                    'expense_account_id' => $acctId,
                ]);

                $journalLines[] = ['account_id' => $acctId, 'type' => 'debit', 'amount' => $lineTotal, 'description' => $item['description']];
            }

            // Credit Accounts Payable for the full bill
            $journalLines[] = ['account_id' => $this->coaId('2001'), 'type' => 'credit', 'amount' => $total, 'description' => "Payable — {$bill->bill_code}"];

            $entry = $this->accountingService->postJournalEntry(
                $data['bill_date'],
                "Vendor bill {$bill->bill_code}",
                $journalLines,
                'auto',
                $bill->bill_code,
                $user
            );

            $bill->update(['journal_entry_id' => $entry->id]);

            // If this bill was created against a Purchase Order, mark that PO billed.
            if (!empty($data['po_id'])) {
                \App\Models\PurchaseOrder::where('id', $data['po_id'])->update(['status' => 'billed']);
            }

            return $bill->load(['items', 'vendor']);
        });
    }

    /**
     * Pay a vendor bill: Debit Accounts Payable (2001), Credit payment account's COA.
     */
    public function payBill(VendorBill $bill, array $data, User $user): Payment
    {
        $amount  = (string) $data['amount'];
        $balance = $bill->balanceDue();

        if (bccomp($amount, '0', 2) <= 0) {
            throw new \InvalidArgumentException('Payment amount must be greater than zero.');
        }
        if (bccomp($amount, $balance, 2) > 0) {
            throw new \InvalidArgumentException("Payment (\${$amount}) exceeds the outstanding balance (\${$balance}).");
        }

        return DB::transaction(function () use ($bill, $data, $amount, $user) {
            $account = Account::findOrFail($data['account_id']);

            if (bccomp($account->balance(), $amount, 2) < 0) {
                throw new \InvalidArgumentException("Insufficient balance in {$account->name} (available: \${$account->balance()}).");
            }

            $entry = $this->accountingService->postJournalEntry(
                $data['payment_date'],
                "Payment for vendor bill {$bill->bill_code}",
                [
                    ['account_id' => $this->coaId('2001'),         'type' => 'debit',  'amount' => $amount, 'description' => "Settle AP — {$bill->bill_code}"],
                    ['account_id' => $account->chart_of_account_id, 'type' => 'credit', 'amount' => $amount, 'description' => "Paid from {$account->name}"],
                ],
                'auto',
                $bill->bill_code,
                $user
            );

            $payment = Payment::create([
                'payment_code'     => $this->refService->generate('RCP'),
                'type'             => 'vendor_payment',
                'vendor_bill_id'   => $bill->id,
                'amount'           => $amount,
                'payment_date'     => $data['payment_date'],
                'payment_method'   => $data['payment_method'],
                'account_id'       => $account->id,
                'reference_number' => $data['reference_number'] ?? null,
                'notes'            => $data['notes'] ?? null,
                'journal_entry_id' => $entry->id,
                'created_by'       => $user->id,
            ]);

            $paid = $bill->amountPaid();
            $bill->update(['status' => bccomp($paid, (string) $bill->total_amount, 2) >= 0 ? 'paid' : 'partial']);

            // If linked to a PO, mark it billed
            if ($bill->po_id && $bill->purchaseOrder) {
                $bill->purchaseOrder->update(['status' => 'billed']);
            }

            return $payment;
        });
    }
}
