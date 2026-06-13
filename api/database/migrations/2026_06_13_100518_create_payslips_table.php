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
        Schema::create('payslips', function (Blueprint $table) {
            $table->id();
            $table->string('payslip_code')->unique(); // PAY-2026-0001
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees');
            $table->integer('working_days_in_month')->default(26);
            $table->integer('days_worked')->default(0);
            $table->decimal('base_pay', 15, 2)->default(0);    // prorated base or daily×days
            $table->decimal('overtime_pay', 15, 2)->default(0);
            $table->decimal('gross_pay', 15, 2)->default(0);
            $table->decimal('total_deductions', 15, 2)->default(0);
            $table->decimal('net_pay', 15, 2)->default(0);
            $table->string('pdf_file_url')->nullable();
            $table->boolean('sent_via_whatsapp')->default(false);
            $table->boolean('sent_via_email')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payslips');
    }
};
