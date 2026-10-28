<?php

namespace App\Providers;

use App\Models\User;
use App\Support\FrontendTokenCookie;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // This runs before auth:sanctum, so identify a presented session token
        // without storing the credential itself in the rate-limit key. Anonymous
        // public traffic keeps a separate per-IP budget.
        RateLimiter::for('backend-api', function (Request $request) {
            $token = $request->bearerToken() ?: FrontendTokenCookie::read($request);
            $hasSessionToken = is_string($token) && strlen($token) >= 20 && strlen($token) <= 512;
            $limit = $hasSessionToken
                ? (int) config('satu_data.rate_limit_per_minute', 1200)
                : (int) config('satu_data.anonymous_rate_limit_per_minute', 120);
            $key = $hasSessionToken
                ? 'token:'.hash('sha256', $token)
                : 'ip:'.(string) $request->ip();

            return Limit::perMinute($limit)
                ->by($key)
                ->response(fn (Request $request, array $headers) => response()->json(
                    ['error' => 'rate_limited', 'message' => 'Too many requests.'],
                    429,
                    array_merge($headers, ['Cache-Control' => 'no-store'])
                ));
        });

        RateLimiter::for('portal-user', function (Request $request) {
            $userId = $request->user()?->id;

            $limit = (int) config('satu_data.portal_user_rate_limit_per_minute', 600);
            $key = $userId
                ? 'user:'.$userId
                : 'portal-anonymous:'.(string) $request->ip();

            return Limit::perMinute($limit)
                ->by($key)
                ->response(fn (Request $request, array $headers) => response()->json(
                    ['error' => 'user_rate_limited', 'message' => 'Batas request akun tercapai.'],
                    429,
                    array_merge($headers, ['Cache-Control' => 'no-store'])
                ));
        });

        // Mutations have a tighter budget than reads, with both per-user and
        // per-source-IP limits. The budgets are high enough for normal admin
        // work but bound scripts that repeatedly submit write operations.
        RateLimiter::for('portal-write', function (Request $request) {
            $userId = $request->user()?->id;
            $ip = (string) $request->ip();

            return [
                Limit::perMinute((int) config('satu_data.portal_write_user_rate_limit_per_minute', 120))
                    ->by($userId ? 'portal-write-user:'.$userId : 'portal-write-anonymous:'.$ip),
                Limit::perMinute((int) config('satu_data.portal_write_ip_rate_limit_per_minute', 300))
                    ->by('portal-write-ip:'.$ip),
            ];
        });

        ResetPassword::createUrlUsing(function (User $user, string $token): string {
            $frontend = rtrim((string) config('satu_data.frontend_url', 'http://localhost:3000'), '/');

            return $frontend.'/portal/reset-password?token='.rawurlencode($token).'&email='.rawurlencode($user->getEmailForPasswordReset());
        });
    }
}
