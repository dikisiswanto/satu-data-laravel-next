<?php

namespace App\Http\Middleware;

use App\Support\FrontendTokenCookie;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireSameOriginForMutations
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $next($request);
        }

        $origin = $request->headers->get('Origin');
        $fetchSite = strtolower((string) $request->headers->get('Sec-Fetch-Site', ''));
        $allowed = array_filter(array_map('trim', explode(',', (string) config('satu_data.frontend_url', 'http://localhost:3000'))));
        $requestOrigin = $request->getSchemeAndHttpHost();
        $allowed[] = $requestOrigin;
        $allowedNormalized = array_map(fn ($value) => rtrim($value, '/'), $allowed);
        $originNormalized = $origin ? rtrim($origin, '/') : null;

        // For requests carrying the browser's HttpOnly auth cookie, require a verifiable
        // Origin or Referer. Non-browser integrations using an explicit Bearer header remain usable.
        $hasFrontendCookie = FrontendTokenCookie::has($request);
        if ($hasFrontendCookie && ! $originNormalized) {
            $referer = (string) $request->headers->get('Referer', '');
            $parts = $referer !== '' ? parse_url($referer) : false;
            $refererOrigin = is_array($parts) && isset($parts['scheme'], $parts['host'])
                ? strtolower($parts['scheme']).'://'.strtolower($parts['host']).(isset($parts['port']) ? ':'.$parts['port'] : '')
                : null;
            if (! $refererOrigin || ! in_array(rtrim($refererOrigin, '/'), $allowedNormalized, true)) {
                return response()->json(['error' => 'origin_not_allowed'], 403, ['Cache-Control' => 'no-store']);
            }
            $originNormalized = rtrim($refererOrigin, '/');
        }

        if (($originNormalized && ! in_array($originNormalized, $allowedNormalized, true)) || $fetchSite === 'cross-site') {
            return response()->json(['error' => 'origin_not_allowed'], 403, ['Cache-Control' => 'no-store']);
        }

        return $next($request);
    }
}
