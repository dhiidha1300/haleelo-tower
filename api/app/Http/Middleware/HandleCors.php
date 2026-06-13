<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class HandleCors
{
    public function handle(Request $request, Closure $next)
    {
        $allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'];
        $origin = $request->header('Origin');

        $isAllowed = in_array($origin, $allowedOrigins);

        // Handle preflight requests immediately
        if ($request->isMethod('OPTIONS')) {
            return response('', 200)
                ->header('Access-Control-Allow-Origin', $isAllowed ? $origin : '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD')
                ->header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-Requested-With')
                ->header('Access-Control-Max-Age', '86400')
                ->header('Access-Control-Allow-Credentials', 'true');
        }

        $response = $next($request);

        // Use headers->set() (not ->header()) so this works for BinaryFileResponse
        // (Excel/file downloads) as well as normal responses.
        $response->headers->set('Access-Control-Allow-Origin', $isAllowed ? $origin : '*');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
        $response->headers->set('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-Requested-With');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');

        return $response;
    }
}
