<?php

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$user = \App\Models\User::find(1);
if ($user) {
    $user->syncRoles(['admin']);
    echo "Admin role assigned to user 1\n";
} else {
    echo "User 1 not found\n";
}
