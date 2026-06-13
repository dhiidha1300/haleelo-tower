<?php

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Find the admin user
$admin = \App\Models\User::where('email', 'admin@halelotower.so')->first();

if ($admin) {
    // Assign admin role
    $admin->syncRoles(['admin']);
    echo "Admin role assigned to user ID: {$admin->id}\n";
    echo "Email: {$admin->email}\n";

    // Create a token for testing
    $token = $admin->createToken('Test Token')->plainTextToken;
    echo "Token: {$token}\n";
} else {
    echo "Admin user not found\n";
}
