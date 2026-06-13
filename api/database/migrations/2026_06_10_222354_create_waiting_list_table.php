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
        Schema::create('waiting_list', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('spaces');
            $table->string('session_type');
            $table->date('booking_date');
            $table->string('client_name');
            $table->string('client_email');
            $table->string('client_phone');
            $table->boolean('notified')->default(false);
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'session_type', 'booking_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('waiting_list');
    }
};
