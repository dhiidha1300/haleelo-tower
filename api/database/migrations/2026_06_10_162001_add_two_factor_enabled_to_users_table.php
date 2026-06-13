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
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('two_factor_enabled')->default(true)->after('phone');
        });

        // Super Admin and Admin default to 2FA disabled
        DB::table('users')
            ->whereIn('id', function ($q) {
                $q->select('model_id')
                  ->from('model_has_roles')
                  ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                  ->whereIn('roles.name', ['super_admin', 'admin']);
            })
            ->update(['two_factor_enabled' => false]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('two_factor_enabled');
        });
    }
};
