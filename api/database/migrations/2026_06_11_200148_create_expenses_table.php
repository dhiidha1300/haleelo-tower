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
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('expense_code')->unique(); // EXP-2026-0001
            $table->string('description');
            $table->decimal('amount', 15, 2);
            $table->date('expense_date');
            $table->foreignId('expense_account_id')->constrained('chart_of_accounts'); // which expense COA
            $table->foreignId('payment_account_id')->constrained('accounts'); // which operating account paid
            $table->foreignId('booking_id')->nullable()->constrained('bookings')->nullOnDelete(); // for per-event P&L
            $table->string('receipt_file_url')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('expense_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
