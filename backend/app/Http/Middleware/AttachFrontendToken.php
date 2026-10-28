<?php

namespace App\Http\Middleware;

use App\Support\FrontendTokenCookie;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Accept the HttpOnly frontend cookie as a bearer token on authenticated portal endpoints only. */
class AttachFrontendToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $path = trim($request->path(), '/');
        $isSessionEndpoint = preg_match('#(?:^|/)(?:v1/)?auth/(?:me|logout)$#', $path) === 1;
        $isPortalEndpoint = preg_match('#(?:^|/)(?:v1/)?portal(?:/|$)#', $path) === 1;

        if ((! $isSessionEndpoint && ! $isPortalEndpoint) || $request->bearerToken()) {
            return $next($request);
        }

        $token = FrontendTokenCookie::read($request);
        if ($token !== null) {
            $authorization = 'Bearer '.$token;
            $request->headers->set('Authorization', $authorization);
            $request->server->set('HTTP_AUTHORIZATION', $authorization);
        }

        return $next($request);
    }
}
