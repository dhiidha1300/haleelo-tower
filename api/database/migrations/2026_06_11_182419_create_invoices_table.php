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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_code')->unique();
            $table->string('type'); // office_rent / educational / conference_hall / electricity / manual
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('lease_id')->nullable()->constrained('leases')->nullOnDelete();
            $table->foreignId('booking_id')->nullable()->constrained('bookings')->nullOnDelete();
            // Snapshot of who is billed (handles conference clients who are not tenants)
            $table->string('bill_to_name')->nullable();
            $table->string('bill_to_email')->nullable();
            $table->string('bill_to_phone')->nullable();
            $table->date('issue_date');
            $table->date('due_date');
            $table->date('billing_period_start')->nullable();
            $table->date('billing_period_end')->nullable();
            $table->string('lpo_number')->nullable();
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->string('status')->default('draft'); // draft / sent / paid / partial / overdue / cancelled
            $table->foreignId('payment_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'due_date']);
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
