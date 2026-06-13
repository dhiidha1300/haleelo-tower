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
        Schema::create('security_deposits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lease_id')->constrained();
            $table->foreignId('tenant_id')->constrained();
            $table->decimal('amount', 15, 2);
            $table->string('status')->default('held'); // held / returned / applied
            $table->date('received_date');
            $table->date('returned_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('security_deposits');
    }
};
