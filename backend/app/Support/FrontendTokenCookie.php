<?php

namespace App\Support;

use Illuminate\Http\Request;

/** Shared cookie-name and validation rules for browser session tokens. */
final class FrontendTokenCookie
{
    public const LEGACY_COOKIE_NAME = 'wajo_portal_token';

    /** @return list<string> */
    public static function names(): array
    {
        $configured = trim((string) config('app.frontend_token_cookie', 'portal_session_token'));
        if ($configured === '' || ! preg_match('/^[A-Za-z0-9_-]{1,80}$/', $configured)) {
            $configured = 'portal_session_token';
        }

        return array_values(array_unique([$configured, self::LEGACY_COOKIE_NAME]));
    }

    public static function read(Request $request): ?string
    {
        foreach (self::names() as $name) {
            $value = $request->cookies->get($name);
            if (self::valid($value)) {
                return $value;
            }
        }

        // Some reverse proxies/framework test clients can leave the normalized
        // cookie bag empty while preserving Cookie. Parse exact names only and
        // reject duplicate names rather than guessing which credential wins.
        $rawHeader = (string) $request->headers->get('Cookie', '');
        if ($rawHeader === '') {
            return null;
        }

        foreach (self::names() as $name) {
            $matches = [];
            foreach (explode(';', $rawHeader) as $part) {
                $pair = explode('=', trim($part), 2);
                if (count($pair) === 2 && trim($pair[0]) === $name) {
                    $matches[] = rawurldecode(trim($pair[1]));
                }
            }
            if (count($matches) > 1) {
                return null;
            }
            if (count($matches) === 1 && self::valid($matches[0])) {
                return $matches[0];
            }
        }

        return null;
    }

    public static function has(Request $request): bool
    {
        return self::read($request) !== null;
    }

    private static function valid(mixed $value): bool
    {
        return is_string($value)
            && strlen($value) >= 20
            && strlen($value) <= 512
            && ! preg_match('/[\r\n\x00-\x20]/', $value);
    }
}
