<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Contra-revenue account for booking discounts (B5). Revenue-type, carries
        // debits, so it nets down revenue on the P&L.
        $exists = DB::table('chart_of_accounts')->where('code', '3090')->exists();
        if (!$exists) {
            DB::table('chart_of_accounts')->insert([
                'code'        => '3090',
                'name'        => 'Sales Discounts',
                'type'        => 'revenue',
                'parent_id'   => null,
                'description' => 'Contra-revenue — discounts given via staff coupon codes',
                'active'      => true,
                'is_system'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('chart_of_accounts')->where('code', '3090')->where('is_system', true)->delete();
    }
};
