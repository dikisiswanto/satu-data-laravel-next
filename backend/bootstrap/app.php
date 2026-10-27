<?php

use App\Http\Middleware\AttachFrontendToken;
use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\RequireSameOriginForMutations;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

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
        $middleware->trustProxies(at: config('app.trusted_proxies'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*') || $request->expectsJson());
    })->create();
