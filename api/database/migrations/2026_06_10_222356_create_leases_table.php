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
        Schema::create('leases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained();
            $table->foreignId('space_id')->constrained('spaces');
            $table->string('lease_code')->unique();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('monthly_rent', 15, 2)->nullable();
            $table->decimal('semester_amount', 15, 2)->nullable();
            $table->string('billing_cycle'); // monthly / semester
            $table->string('status')->default('active'); // active / expired / terminated
            $table->decimal('security_deposit_amount', 15, 2)->default(0);
            $table->string('security_deposit_status')->default('held'); // held / returned / applied
            $table->boolean('contract_signed_online')->default(false);
            $table->string('contract_file_url')->nullable();
            $table->string('external_contract_url')->nullable();
            $table->boolean('renewal_reminder_sent')->default(false);
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leases');
    }
};
