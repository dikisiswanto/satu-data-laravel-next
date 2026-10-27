<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || ! $user->is_active) {
            return response()->json(['error' => 'account_inactive'], 403, ['Cache-Control' => 'no-store']);
        }

        return $next($request);
    }
}
