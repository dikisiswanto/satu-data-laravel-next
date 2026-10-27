<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Accept the HttpOnly cookie set by the Next.js server action as a Sanctum bearer token. */
class AttachFrontendToken
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->bearerToken()) {
            $cookieName = (string) config('app.frontend_token_cookie', 'wajo_portal_token');
            $token = $request->cookie($cookieName);
            if (is_string($token) && strlen($token) >= 20 && strlen($token) <= 512) {
                $request->headers->set('Authorization', 'Bearer '.$token);
            }
        }

        return $next($request);
    }
}
