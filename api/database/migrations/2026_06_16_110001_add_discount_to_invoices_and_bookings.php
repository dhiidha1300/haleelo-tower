<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('discount_percent', 5, 2)->nullable()->after('subtotal');
            $table->decimal('discount_amount', 12, 2)->default(0)->after('discount_percent');
            $table->foreignId('coupon_id')->nullable()->after('discount_amount')->constrained()->nullOnDelete();
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('coupon_id')->nullable()->after('total_price')->constrained()->nullOnDelete();
            $table->decimal('discount_percent', 5, 2)->nullable()->after('coupon_id');
            $table->decimal('discount_amount', 12, 2)->nullable()->after('discount_percent');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropConstrainedForeignId('coupon_id');
            $table->dropColumn(['discount_percent', 'discount_amount']);
        });
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('coupon_id');
            $table->dropColumn(['discount_percent', 'discount_amount']);
        });
    }
};
