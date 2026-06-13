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
        Schema::table('security_deposits', function (Blueprint $table) {
            $table->foreignId('received_journal_id')->nullable()->after('status')->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('return_journal_id')->nullable()->after('received_journal_id')->constrained('journal_entries')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('security_deposits', function (Blueprint $table) {
            $table->dropConstrainedForeignId('received_journal_id');
            $table->dropConstrainedForeignId('return_journal_id');
        });
    }
};
