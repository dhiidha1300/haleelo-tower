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
        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('month'); // YYYY-MM
            $table->integer('working_days_in_month')->default(26);
            $table->integer('days_worked')->default(0);
            $table->integer('days_absent')->default(0);
            $table->integer('late_arrivals')->default(0);
            $table->timestamps();

            $table->unique(['employee_id', 'month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_logs');
    }
};
