<?php

namespace App\Providers;

use App\Models\User;
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
        // The outer middleware runs before auth:sanctum, so this limit must
        // intentionally be IP based. Authenticated routes add a second per-user
        // limit after identity has been resolved.
        RateLimiter::for('backend-api', function (Request $request) {
            return Limit::perMinute((int) config('satu_data.rate_limit_per_minute', 120))
                ->by('ip:'.(string) $request->ip())
                ->response(fn (Request $request, array $headers) => response()->json(
                    ['error' => 'rate_limited', 'message' => 'Too many requests.'],
                    429,
                    array_merge($headers, ['Cache-Control' => 'no-store'])
                ));
        });

        RateLimiter::for('portal-user', function (Request $request) {
            $userId = $request->user()?->id;

            return Limit::perMinute(300)
                ->by($userId ? 'user:'.$userId : 'portal-anonymous:'.(string) $request->ip())
                ->response(fn (Request $request, array $headers) => response()->json(
                    ['error' => 'user_rate_limited', 'message' => 'Batas request akun tercapai.'],
                    429,
                    array_merge($headers, ['Cache-Control' => 'no-store'])
                ));
        });

        ResetPassword::createUrlUsing(function (User $user, string $token): string {
            $frontend = rtrim((string) config('satu_data.frontend_url', 'http://localhost:3000'), '/');

            return $frontend.'/portal/reset-password?token='.rawurlencode($token).'&email='.rawurlencode($user->getEmailForPasswordReset());
        });
    }
}
