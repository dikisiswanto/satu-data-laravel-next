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
        // Registered first in Laravel's API middleware group so the cookie is
        // converted before route-level throttles and Sanctum authentication.
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

        $cookieName = trim((string) config('app.frontend_token_cookie', 'wajo_portal_token'));
        if ($cookieName === '') {
            $cookieName = 'wajo_portal_token';
        }

        // Symfony's cookie bag is authoritative for both real HTTP requests and
        // Laravel's test client. Reject malformed values before they reach the
        // authorization header; Sanctum will validate the token itself.
        $token = $request->cookies->get($cookieName);
        if (
            is_string($token)
            && strlen($token) >= 20
            && strlen($token) <= 512
            && ! preg_match('/[\r\n\x00-\x20]/', $token)
        ) {
            $authorization = 'Bearer '.$token;
            $request->headers->set('Authorization', $authorization);
            // Keep the Symfony server bag aligned for SAPI/proxy integrations
            // that read HTTP_AUTHORIZATION instead of the normalized header bag.
            $request->server->set('HTTP_AUTHORIZATION', $authorization);
        }

        return $next($request);
    }
}
