<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('account_transactions', function (Blueprint $table) {
            $table->boolean('reconciled')->default(false)->after('transaction_date');
            $table->timestamp('reconciled_at')->nullable()->after('reconciled');
        });
    }

    public function down(): void
    {
        Schema::table('account_transactions', function (Blueprint $table) {
            $table->dropColumn(['reconciled', 'reconciled_at']);
        });
    }
};
