<?php

if (php_sapi_name() === 'cli-server') {
    // Handle static files
    $url  = parse_url($_SERVER['REQUEST_URI']);
    $file = __DIR__ . $url['path'];

    if (is_file($file)) {
        return false;
    }
}

// Route all requests to Laravel's front controller
require __DIR__ . '/public/index.php';
