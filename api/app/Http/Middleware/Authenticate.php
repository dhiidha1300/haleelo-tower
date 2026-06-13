<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Exceptions\HttpResponseException;

class Authenticate extends Middleware
{
    protected function redirectTo($request)
    {
        // Always return JSON for all unauthenticated requests
        // (This is an API, not a web app)
        throw new HttpResponseException(
            response()->json(['message' => 'Unauthenticated.'], 401)
        );
    }
}
