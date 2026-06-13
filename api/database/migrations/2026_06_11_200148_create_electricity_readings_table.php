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
        Schema::create('electricity_readings', function (Blueprint $table) {
            $table->id();
            $table->string('electricity_bill_code')->unique(); // ELEC-2026-0001
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('space_id')->constrained('spaces');
            $table->date('reading_date');
            $table->string('billing_period_month'); // e.g. 2026-06
            $table->decimal('previous_reading', 12, 2)->default(0);
            $table->decimal('current_reading', 12, 2);
            $table->decimal('kwh_consumed', 12, 2);
            $table->foreignId('rate_id')->nullable()->constrained('electricity_rates')->nullOnDelete();
            $table->decimal('rate_per_kwh', 10, 4); // snapshot — never retroactively altered
            $table->decimal('total_charge', 15, 2);
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->string('status')->default('recorded'); // recorded / invoiced
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'space_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('electricity_readings');
    }
};
