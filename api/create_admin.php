<?php

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Delete existing admin
\App\Models\User::where('email', 'admin@halelotower.so')->delete();

// Create new admin
$admin = \App\Models\User::create([
    'name' => 'Admin User',
    'email' => 'admin@halelotower.so',
    'password' => bcrypt('AdminPass123!'),
    'status' => 'active',
]);

// Assign admin role
$admin->assignRole('admin');

echo "Admin user created with ID: {$admin->id}\n";
echo "Email: {$admin->email}\n";

// Create a token for testing
$token = $admin->createToken('Test Token')->plainTextToken;
echo "Token: {$token}\n";
