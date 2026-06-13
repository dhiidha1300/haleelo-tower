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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_code')->unique(); // EMP-2026-0001
            $table->string('full_name');
            $table->string('job_title')->nullable();
            $table->string('department'); // internal_staff / maintenance / cafeteria
            $table->string('employment_type'); // salaried / daily_rate
            $table->decimal('base_salary', 15, 2)->default(0); // monthly, for salaried
            $table->decimal('daily_rate', 15, 2)->default(0);  // for daily-rate workers
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->date('start_date')->nullable();
            $table->string('status')->default('active'); // active / inactive
            $table->string('contract_file_url')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
