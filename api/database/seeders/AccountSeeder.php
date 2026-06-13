<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;

class AccountSeeder extends Seeder
{
    public function run(): void
    {
        // The 5 operating accounts, each linked to its Chart-of-Accounts code.
        $accounts = [
            ['1010', 'Edahab – Conference Halls', 'mobile_money', 'Used exclusively for conference hall booking payments'],
            ['1011', 'ZAAD – Conference Halls',   'mobile_money', 'Used exclusively for conference hall booking payments'],
            ['1012', 'Edahab – Office Rentals',   'mobile_money', 'Used exclusively for office rent payments'],
            ['1013', 'ZAAD – Office Rentals',     'mobile_money', 'Used exclusively for office rent payments'],
            ['1020', 'Darasalam Bank (Main)',     'bank',         'Primary bank account'],
        ];

        foreach ($accounts as [$code, $name, $type, $notes]) {
            $coa = ChartOfAccount::where('code', $code)->first();
            if (!$coa) continue;

            Account::firstOrCreate(
                ['chart_of_account_id' => $coa->id],
                [
                    'name'   => $name,
                    'type'   => $type,
                    'active' => true,
                    'notes'  => $notes,
                ]
            );
        }
    }
}
