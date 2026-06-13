<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vendor_bills', function (Blueprint $table) {
            $table->id();
            $table->string('bill_code')->unique(); // VB-2026-0001
            $table->foreignId('vendor_id')->constrained('vendors');
            $table->foreignId('po_id')->nullable()->constrained('purchase_orders')->nullOnDelete();
            $table->date('bill_date');
            $table->date('due_date')->nullable();
            $table->string('status')->default('unpaid'); // unpaid / partial / paid / cancelled
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->foreignId('expense_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignId('payment_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->string('receipt_file_url')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'due_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendor_bills');
    }
};
