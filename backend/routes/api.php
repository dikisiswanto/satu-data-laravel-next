<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\OpenApiController;
use App\Http\Controllers\Api\PortalAdminController;
use App\Http\Controllers\Api\PortalDatasetController;
use App\Http\Controllers\Api\PortalIndicatorController;
use App\Http\Controllers\Api\PortalSdiController;
use App\Http\Controllers\Api\PublicDataController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:backend-api')->group(function (): void {

    // Public, cacheable API. Laravel's API route group already prefixes all paths with /api.
    Route::get('/health', HealthController::class)->name('api.health');
    Route::get('/openapi', OpenApiController::class)->name('api.openapi');
    Route::get('/openapi.json', [OpenApiController::class, 'json'])->name('api.openapi.json');
    Route::get('/openapi.yaml', [OpenApiController::class, 'yaml'])->name('api.openapi.yaml');

    Route::prefix('v1')->group(function (): void {
        Route::get('/datasets', [PublicDataController::class, 'datasets']);
        Route::get('/datasets/{slug}', [PublicDataController::class, 'dataset']);
        Route::get('/datasets/{slug}/resources/{resourceId}/rows', [PublicDataController::class, 'resourceRows']);
        Route::get('/indicators', [PublicDataController::class, 'indicators']);
        Route::get('/indicators/{slug}', [PublicDataController::class, 'indicator']);
        Route::get('/indicators/{slug}/observations', [PublicDataController::class, 'indicatorObservations']);
        Route::get('/indicator-ids/{id}/observations', [PublicDataController::class, 'indicatorObservationsById']);
        Route::get('/organizations', [PublicDataController::class, 'organizations']);
        Route::get('/organizations/{slug}', [PublicDataController::class, 'organization']);
    });
    Route::get('/dataset/{slug}/resources/{resourceId}', [PublicDataController::class, 'downloadResource']);
    Route::get('/public/facets', [PublicDataController::class, 'facets']);
    Route::get('/public/revision', [PublicDataController::class, 'revision']);
    Route::get('/public/stats', [PublicDataController::class, 'stats']);
    Route::get('/public/organizations', [PublicDataController::class, 'organizations']);

    Route::prefix('sdi/v1')->group(function (): void {
        Route::get('/catalog', [PortalSdiController::class, 'catalog']);
        Route::get('/data.json', [PortalSdiController::class, 'harvestData']);
        Route::get('/geoportal-manifest', [PortalSdiController::class, 'geoportalManifest']);
        Route::get('/profile', [PortalSdiController::class, 'profile']);
        Route::get('/reference-codes', [PortalSdiController::class, 'referenceCodes']);
        Route::get('/standards', [PortalSdiController::class, 'standards']);
    });

    // Login/reset endpoints are public; throttling is also applied at the Laravel route level.
    Route::prefix('auth')->middleware('throttle:10,1')->group(function (): void {
        Route::post('/login', [AuthController::class, 'login'])->middleware('same.origin');
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware(['same.origin', 'throttle:3,1']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware(['same.origin', 'throttle:5,1']);
    });

    // Non-versioned compatibility routes retained for old clients; new integrations should use /api/v1/portal.
    Route::prefix('portal')->group(function (): void {
        // A short-lived upload capability is used for the direct binary upload, avoiding a second
        // in-memory copy of 25 MiB files through Next.js. The controller validates the capability.
        Route::post('/dataset/{id}/upload-content', [PortalDatasetController::class, 'uploadContent'])->middleware('throttle:30,1');

        Route::middleware(['frontend.token', 'auth:sanctum', 'active.user', 'throttle:portal-user'])->group(function (): void {
            Route::get('/dashboard', [PortalAdminController::class, 'dashboard']);
            Route::get('/shell', [PortalAdminController::class, 'shell']);
            Route::get('/profile', [PortalAdminController::class, 'profile']);
            Route::patch('/profile', [PortalAdminController::class, 'updateProfile'])->middleware('same.origin');
            Route::patch('/profile/password', [PortalAdminController::class, 'updatePassword'])->middleware('same.origin');
            Route::post('/onboarding', [PortalAdminController::class, 'completeOnboarding'])->middleware('same.origin');
            Route::get('/riwayat', [PortalAdminController::class, 'auditLogs']);
            Route::get('/profiles', [PortalAdminController::class, 'profiles']);
            Route::get('/sdi/runs', [PortalAdminController::class, 'harvestRuns']);
            Route::get('/sdi-registry/catalog', [PortalAdminController::class, 'sdiRegistryCatalog']);

            Route::get('/datasets', [PortalDatasetController::class, 'index']);
            Route::post('/datasets', [PortalDatasetController::class, 'create'])->middleware('same.origin');
            Route::get('/datasets/{id}', [PortalDatasetController::class, 'show']);
            Route::patch('/datasets/{id}', [PortalDatasetController::class, 'update'])->middleware('same.origin');
            Route::post('/datasets/{id}/workflow', [PortalDatasetController::class, 'workflowAction'])->middleware('same.origin');
            Route::patch('/datasets/{id}/sdi-metadata', [PortalDatasetController::class, 'updateSdiMetadata'])->middleware('same.origin');
            Route::post('/dataset/{id}/upload', [PortalDatasetController::class, 'uploadControl'])->middleware('same.origin')->middleware('throttle:60,1');
            Route::get('/dataset/{id}/conversion-status', [PortalDatasetController::class, 'conversionStatus']);

            Route::get('/organizations', [PortalAdminController::class, 'organizations']);
            Route::post('/organizations', [PortalAdminController::class, 'saveOrganization'])->middleware('same.origin');
            Route::get('/organizations/{id}', [PortalAdminController::class, 'organization']);
            Route::patch('/organizations/{id}', [PortalAdminController::class, 'saveOrganization'])->middleware('same.origin');
            Route::get('/memberships', [PortalAdminController::class, 'memberships']);
            Route::post('/memberships', [PortalAdminController::class, 'saveMembership'])->middleware('same.origin');
            Route::patch('/memberships/{id}', [PortalAdminController::class, 'saveMembership'])->middleware('same.origin');
            Route::post('/users/invite', [PortalAdminController::class, 'inviteUser'])->middleware('same.origin');

            Route::get('/indicators', [PortalIndicatorController::class, 'index']);
            Route::get('/indicators/{id}', [PortalIndicatorController::class, 'show']);
            Route::post('/indicators', [PortalIndicatorController::class, 'save'])->middleware('same.origin');
            Route::post('/indicators/{id}', [PortalIndicatorController::class, 'action'])->middleware('same.origin');
            Route::get('/indicators/{id}/observations', [PortalIndicatorController::class, 'observations']);
            Route::post('/indicators/{id}/observations', [PortalIndicatorController::class, 'saveObservation'])->middleware('same.origin');
            Route::patch('/indicators/{id}/observations', [PortalIndicatorController::class, 'publishObservation'])->middleware('same.origin');

            Route::post('/sdi-registry', [PortalSdiController::class, 'saveRegistry'])->middleware('same.origin');
            Route::patch('/sdi-registry', [PortalSdiController::class, 'reviewRegistry'])->middleware('same.origin');
            Route::get('/kualitas/summary', [PortalSdiController::class, 'qualitySummary']);
            Route::post('/integrasi/preflight', [PortalSdiController::class, 'preflight'])->middleware(['same.origin', 'throttle:5,1']);
            Route::get('/standar', [PortalSdiController::class, 'standards']);

            Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('same.origin');
        });
    });

    Route::middleware(['frontend.token', 'auth:sanctum', 'active.user', 'throttle:portal-user'])->get('/auth/me', [AuthController::class, 'me']);
    Route::middleware(['frontend.token', 'auth:sanctum', 'active.user', 'throttle:portal-user', 'same.origin'])->post('/auth/logout', [AuthController::class, 'logout']);

    // Canonical versioned API aliases. Legacy /api/portal, /api/auth, /api/public,
    // and /api/sdi/v1 routes remain available during the frontend transition.
    Route::prefix('v1')->group(function (): void {
        Route::get('/public/facets', [PublicDataController::class, 'facets']);
        Route::get('/public/revision', [PublicDataController::class, 'revision']);
        Route::get('/public/stats', [PublicDataController::class, 'stats']);
        Route::get('/public/organizations', [PublicDataController::class, 'organizations']);
        Route::get('/datasets/{slug}/resources/{resourceId}', [PublicDataController::class, 'downloadResource']);
        Route::get('/datasets/{slug}/resources/{resourceId}/download', [PublicDataController::class, 'downloadResource']);
        Route::get('/indicators/by-id/{id}/observations', [PublicDataController::class, 'indicatorObservationsById']);

        Route::prefix('sdi')->group(function (): void {
            Route::get('/catalog', [PortalSdiController::class, 'catalog']);
            Route::get('/data.json', [PortalSdiController::class, 'harvestData']);
            Route::get('/geoportal-manifest', [PortalSdiController::class, 'geoportalManifest']);
            Route::get('/profile', [PortalSdiController::class, 'profile']);
            Route::get('/reference-codes', [PortalSdiController::class, 'referenceCodes']);
            Route::get('/standards', [PortalSdiController::class, 'standards']);
        });

        Route::prefix('auth')->middleware('throttle:10,1')->group(function (): void {
            Route::post('/login', [AuthController::class, 'login'])->middleware('same.origin');
            Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware(['same.origin', 'throttle:3,1']);
            Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware(['same.origin', 'throttle:5,1']);
            Route::middleware(['frontend.token', 'auth:sanctum', 'active.user', 'throttle:portal-user'])->group(function (): void {
                Route::get('/me', [AuthController::class, 'me']);
                Route::post('/logout', [AuthController::class, 'logout'])->middleware('same.origin');
            });
        });

        Route::prefix('portal')->group(function (): void {
            // Upload bytes use the short-lived capability token, so the session cookie
            // is not required by the binary endpoint itself.
            Route::post('/datasets/{id}/uploads/content', [PortalDatasetController::class, 'uploadContent'])->middleware('throttle:30,1');

            Route::middleware(['frontend.token', 'auth:sanctum', 'active.user', 'throttle:portal-user'])->group(function (): void {
                Route::get('/dashboard', [PortalAdminController::class, 'dashboard']);
                Route::get('/shell', [PortalAdminController::class, 'shell']);
                Route::get('/profile', [PortalAdminController::class, 'profile']);
                Route::patch('/profile', [PortalAdminController::class, 'updateProfile'])->middleware('same.origin');
                Route::patch('/profile/password', [PortalAdminController::class, 'updatePassword'])->middleware('same.origin');
                Route::post('/onboarding', [PortalAdminController::class, 'completeOnboarding'])->middleware('same.origin');
                Route::get('/audit-logs', [PortalAdminController::class, 'auditLogs']);
                Route::get('/profiles', [PortalAdminController::class, 'profiles']);
                Route::get('/sdi/harvest-runs', [PortalAdminController::class, 'harvestRuns']);
                Route::get('/sdi/registry', [PortalAdminController::class, 'sdiRegistryCatalog']);
                // Deprecated English/Indonesian compatibility aliases for older clients.
                Route::get('/riwayat', [PortalAdminController::class, 'auditLogs']);
                Route::get('/sdi/runs', [PortalAdminController::class, 'harvestRuns']);
                Route::get('/sdi-registry/catalog', [PortalAdminController::class, 'sdiRegistryCatalog']);

                Route::get('/datasets', [PortalDatasetController::class, 'index']);
                Route::post('/datasets', [PortalDatasetController::class, 'create'])->middleware('same.origin');
                Route::get('/datasets/{id}', [PortalDatasetController::class, 'show']);
                Route::patch('/datasets/{id}', [PortalDatasetController::class, 'update'])->middleware('same.origin');
                Route::post('/datasets/{id}/workflow', [PortalDatasetController::class, 'workflowAction'])->middleware('same.origin');
                Route::patch('/datasets/{id}/sdi-metadata', [PortalDatasetController::class, 'updateSdiMetadata'])->middleware('same.origin');
                Route::post('/datasets/{id}/uploads', [PortalDatasetController::class, 'uploadControl'])->middleware('same.origin')->middleware('throttle:60,1');
                Route::get('/datasets/{id}/conversion-status', [PortalDatasetController::class, 'conversionStatus']);

                Route::get('/organizations', [PortalAdminController::class, 'organizations']);
                Route::post('/organizations', [PortalAdminController::class, 'saveOrganization'])->middleware('same.origin');
                Route::get('/organizations/{id}', [PortalAdminController::class, 'organization']);
                Route::patch('/organizations/{id}', [PortalAdminController::class, 'saveOrganization'])->middleware('same.origin');
                Route::get('/memberships', [PortalAdminController::class, 'memberships']);
                Route::post('/memberships', [PortalAdminController::class, 'saveMembership'])->middleware('same.origin');
                Route::patch('/memberships/{id}', [PortalAdminController::class, 'saveMembership'])->middleware('same.origin');
                Route::post('/users/invite', [PortalAdminController::class, 'inviteUser'])->middleware('same.origin');

                Route::get('/indicators', [PortalIndicatorController::class, 'index']);
                Route::get('/indicators/{id}', [PortalIndicatorController::class, 'show']);
                Route::post('/indicators', [PortalIndicatorController::class, 'save'])->middleware('same.origin');
                Route::post('/indicators/{id}/workflow', [PortalIndicatorController::class, 'action'])->middleware('same.origin');
                Route::post('/indicators/{id}', [PortalIndicatorController::class, 'action'])->middleware('same.origin'); // Deprecated transition alias.
                Route::get('/indicators/{id}/observations', [PortalIndicatorController::class, 'observations']);
                Route::post('/indicators/{id}/observations', [PortalIndicatorController::class, 'saveObservation'])->middleware('same.origin');
                Route::patch('/indicators/{id}/observations/{observationId}', [PortalIndicatorController::class, 'publishObservation'])->middleware('same.origin');
                Route::patch('/indicators/{id}/observations', [PortalIndicatorController::class, 'publishObservation'])->middleware('same.origin'); // Deprecated transition alias.

                Route::post('/sdi/registry/entries', [PortalSdiController::class, 'saveRegistry'])->middleware('same.origin');
                Route::patch('/sdi/registry/reviews', [PortalSdiController::class, 'reviewRegistry'])->middleware('same.origin');
                Route::get('/data-quality/summary', [PortalSdiController::class, 'qualitySummary']);
                Route::post('/integrations/preflight', [PortalSdiController::class, 'preflight'])->middleware(['same.origin', 'throttle:5,1']);
                Route::get('/sdi/standards', [PortalSdiController::class, 'standards']);

                // Deprecated aliases for the first Laravel cutover; remove only after all clients migrate.
                Route::post('/sdi-registry', [PortalSdiController::class, 'saveRegistry'])->middleware('same.origin');
                Route::patch('/sdi-registry', [PortalSdiController::class, 'reviewRegistry'])->middleware('same.origin');
                Route::get('/kualitas/summary', [PortalSdiController::class, 'qualitySummary']);
                Route::post('/integrasi/preflight', [PortalSdiController::class, 'preflight'])->middleware(['same.origin', 'throttle:5,1']);
                Route::get('/standar', [PortalSdiController::class, 'standards']);
            });
        });
    });
});
