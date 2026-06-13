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
        DB::statement('ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check');
        DB::statement("
            ALTER TABLE audit_logs
            ADD CONSTRAINT audit_logs_action_check
            CHECK (action IN (
                'created','updated','deleted',
                'approved','rejected',
                'login','logout','failed_login',
                'exported'
            ))
        ");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check');
        DB::statement("
            ALTER TABLE audit_logs
            ADD CONSTRAINT audit_logs_action_check
            CHECK (action IN (
                'created','updated','deleted',
                'approved','rejected',
                'login','logout',
                'exported'
            ))
        ");
    }
};
