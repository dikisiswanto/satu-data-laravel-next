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
        // Run as a global middleware so the cookie is converted before *any*
        // route middleware (including backend-api throttling and Sanctum auth).
        // Keep the cookie credential limited to authenticated portal endpoints.
        $path = trim($request->path(), '/');
        $isSupportedPortalPath = $path === 'api/v1/auth/me'
            || $path === 'api/v1/auth/logout'
            || str_starts_with($path, 'api/v1/portal/')
            || $path === 'api/v1/portal'
            || str_starts_with($path, 'api/portal/')
            || $path === 'api/portal';

        if (! $isSupportedPortalPath || $request->bearerToken()) {
            return $next($request);
        }

        $cookieName = (string) config('app.frontend_token_cookie', 'wajo_portal_token');
        $token = $request->cookie($cookieName);
        if (is_string($token) && strlen($token) >= 20 && strlen($token) <= 512) {
            $request->headers->set('Authorization', 'Bearer '.$token);
        }

        return $next($request);
    }
}
