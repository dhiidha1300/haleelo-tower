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
        // Immutable, append-only ledger — never updated or deleted at the app layer.
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->string('journal_code')->unique(); // JE-2026-0001
            $table->date('entry_date');
            $table->string('description');
            $table->string('reference_code')->nullable(); // links to INV/RCP/EXP/TRF etc.
            $table->string('source')->default('manual');  // auto / manual
            $table->foreignId('posted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('entry_date');
            $table->index('source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journal_entries');
    }
};
