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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_code')->unique(); // RCP-2026-0001
            $table->string('type'); // customer_receipt / vendor_payment
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->unsignedBigInteger('vendor_bill_id')->nullable(); // FK added in Phase 3c
            $table->decimal('amount', 15, 2);
            $table->date('payment_date');
            $table->string('payment_method'); // edahab / zaad / bank_transfer / cheque / cash
            $table->foreignId('account_id')->constrained('accounts'); // operating account that received/paid
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('payment_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
