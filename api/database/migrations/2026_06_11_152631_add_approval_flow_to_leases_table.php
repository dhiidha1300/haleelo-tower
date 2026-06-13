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
        Schema::table('leases', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable()->after('status');
            $table->foreignId('approved_by_user_id')->nullable()->after('created_by_user_id')->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approved_by_user_id');
        });

        // Existing leases were created under the old direct-creation model — treat them as already approved/active.
        // New leases default to 'pending_approval' (set in the model/service).
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('approved_by_user_id');
            $table->dropColumn(['rejection_reason', 'approved_at']);
        });
    }
};
