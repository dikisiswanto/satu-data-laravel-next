<?php

use App\Http\Middleware\AddApiSecurityHeaders;
use App\Http\Middleware\AttachFrontendToken;
use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\RequireSameOriginForMutations;
use App\Http\Middleware\TrustConfiguredProxies;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(AddApiSecurityHeaders::class);
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
        $exceptions->render(function (Throwable $exception, Request $request) {
            if (
                ! $request->is('api/*')
                || ($exception instanceof HttpExceptionInterface && $exception->getStatusCode() < 500)
                || $exception instanceof ValidationException
                || $exception instanceof AuthenticationException
                || $exception instanceof AuthorizationException
            ) {
                return null;
            }

            $candidateId = (string) $request->header('X-Request-Id', '');
            $requestId = Str::isUuid($candidateId) ? strtolower($candidateId) : (string) Str::uuid();
            $errorInfo = $exception instanceof QueryException ? ($exception->errorInfo ?? []) : [];
            $sqlState = $errorInfo[0] ?? null;
            $driverCode = isset($errorInfo[1]) ? (string) $errorInfo[1] : null;
            $databaseMessage = strtolower($exception->getMessage());
            $isUniqueConstraintViolation = $exception instanceof QueryException && (
                $sqlState === '23505'
                || $driverCode === '1062'
                || str_contains($databaseMessage, 'unique constraint failed')
                || str_contains($databaseMessage, 'duplicate entry')
                || str_contains($databaseMessage, 'duplicate key value violates unique constraint')
            );
            if ($isUniqueConstraintViolation) {
                Log::warning('api_unique_constraint_conflict', [
                    'request_id' => $requestId,
                    'method' => $request->method(),
                    'path' => $request->path(),
                    'sql_state' => $sqlState,
                ]);

                return response()->json([
                    'error' => 'conflict',
                    'message' => 'A record with the same unique identifier already exists.',
                    'request_id' => $requestId,
                ], 409, ['Cache-Control' => 'no-store', 'X-Request-Id' => $requestId]);
            }
            Log::error('api_unhandled_exception', [
                'request_id' => $requestId,
                'method' => $request->method(),
                'path' => $request->path(),
                'exception' => $exception::class,
                'sql_state' => $exception instanceof QueryException
                    ? ($exception->errorInfo[0] ?? null)
                    : null,
            ]);

            return response()->json([
                'error' => 'service_unavailable',
                'message' => 'The service could not complete the request.',
                'request_id' => $requestId,
            ], 500, ['Cache-Control' => 'no-store', 'X-Request-Id' => $requestId]);
        });
    })->create();
