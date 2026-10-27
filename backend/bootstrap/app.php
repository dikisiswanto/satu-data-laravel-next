<?php

use App\Http\Middleware\AttachFrontendToken;
use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\RequireSameOriginForMutations;
use App\Http\Middleware\TrustConfiguredProxies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\TrustProxies;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'frontend.token' => AttachFrontendToken::class,
            'same.origin' => RequireSameOriginForMutations::class,
            'active.user' => EnsureActiveUser::class,
        ]);
        // Baca konfigurasi proxy saat request diproses, bukan ketika container
        // belum mendaftarkan layanan config. Ini membuat `artisan migrate` dapat
        // berjalan pada bootstrap CLI maupun saat konfigurasi di-cache.
        $middleware->replace(TrustProxies::class, TrustConfiguredProxies::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*') || $request->expectsJson());
    })->create();
