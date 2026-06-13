<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            SystemSettingsSeeder::class,
            UserSeeder::class,
            FloorSeeder::class,
            SpaceSeeder::class,
            ChartOfAccountsSeeder::class,
            AccountSeeder::class,
        ]);
    }
}
