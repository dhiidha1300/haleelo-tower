<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;

class ChartOfAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            // ── Assets (1xxx) ────────────────────────────────────────────────
            ['1001', 'Cash (Petty Cash)',                  'asset'],
            ['1010', 'Edahab – Conference Halls',          'asset'],
            ['1011', 'ZAAD – Conference Halls',            'asset'],
            ['1012', 'Edahab – Office Rentals',            'asset'],
            ['1013', 'ZAAD – Office Rentals',              'asset'],
            ['1020', 'Darasalam Bank (Main)',              'asset'],
            ['1100', 'Accounts Receivable – Office Tenants','asset'],
            ['1101', 'Accounts Receivable – Conference Clients', 'asset'],
            ['1200', 'Security Deposits Held',             'asset'],
            ['1300', 'Prepaid Expenses',                   'asset'],

            // ── Liabilities (2xxx) ───────────────────────────────────────────
            ['2001', 'Accounts Payable – Vendors',         'liability'],
            ['2100', 'Security Deposits Owed',             'liability'],
            ['2200', 'Salary Payable',                     'liability'],

            // ── Equity (5xxx) — added so the Balance Sheet can balance ───────
            ['5001', 'Owner\'s Equity',                    'equity'],
            ['5002', 'Retained Earnings',                  'equity'],
            ['5003', 'Opening Balance Equity',             'equity'],

            // ── Revenue (3xxx) ───────────────────────────────────────────────
            ['3001', 'Conference Hall Rental Income',      'revenue'],
            ['3002', 'Office Rental Income',               'revenue'],
            ['3003', 'Educational Facility Income',        'revenue'],
            ['3010', 'Catering Revenue (Silver)',          'revenue'],
            ['3011', 'Catering Revenue (Gold)',            'revenue'],
            ['3012', 'Catering Revenue (Platinum)',        'revenue'],
            ['3020', 'DJ / Cameraman Revenue',             'revenue'],
            ['3030', 'Additional Services Revenue',        'revenue'],

            // ── Expenses (4xxx) ──────────────────────────────────────────────
            ['4001', 'Electricity (Utility)',              'expense'],
            ['4002', 'Water (Utility)',                    'expense'],
            ['4003', 'Sewage (Utility)',                   'expense'],
            ['4004', 'Garbage Collection',                 'expense'],
            ['4010', 'Salaries – Internal Staff',          'expense'],
            ['4011', 'Salaries – Maintenance',             'expense'],
            ['4012', 'Salaries – Cafeteria / Restaurant',  'expense'],
            ['4020', 'Maintenance & Repairs',              'expense'],
            ['4030', 'Catering Supplies / Costs',          'expense'],
            ['4031', 'DJ / Cameraman Costs',               'expense'],
            ['4040', 'Cleaning Supplies',                  'expense'],
            ['4050', 'Office Supplies',                    'expense'],
            ['4060', 'Internet & Telecommunications',      'expense'],
            ['4070', 'Vendor – Event Materials',           'expense'],
            ['4080', 'Miscellaneous Expenses',             'expense'],
        ];

        foreach ($accounts as [$code, $name, $type]) {
            ChartOfAccount::firstOrCreate(
                ['code' => $code],
                ['name' => $name, 'type' => $type, 'active' => true, 'is_system' => true]
            );
        }
    }
}
