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
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_code')->unique();
            $table->string('type'); // conference_hall / office_lease / educational_lease
            $table->foreignId('product_id')->constrained('spaces');
            $table->string('client_name');
            $table->string('client_company')->nullable();
            $table->string('client_email');
            $table->string('client_phone');
            $table->string('client_national_id')->nullable();
            $table->string('session_type'); // morning / afternoon / evening / custom
            $table->date('booking_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('recurring')->default(false);
            $table->jsonb('recurrence_rule')->nullable();
            $table->unsignedBigInteger('recurrence_group_id')->nullable();
            $table->foreignId('catering_package_id')->nullable()->constrained('catering_packages')->nullOnDelete();
            $table->boolean('dj_requested')->default(false);
            $table->boolean('cameraman_requested')->default(false);
            $table->jsonb('extra_services')->nullable();
            $table->decimal('base_price', 15, 2)->default(0);
            $table->decimal('catering_price', 15, 2)->default(0);
            $table->decimal('dj_price', 15, 2)->default(0);
            $table->decimal('cameraman_price', 15, 2)->default(0);
            $table->decimal('extras_price', 15, 2)->default(0);
            $table->decimal('total_price', 15, 2)->default(0);
            $table->string('status')->default('draft');
            $table->string('payment_status')->default('unpaid');
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['product_id', 'booking_date', 'session_type', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
