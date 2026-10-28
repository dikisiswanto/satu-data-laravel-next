<?php

namespace Tests\Unit;

use App\Http\Middleware\AttachFrontendToken;
use Illuminate\Http\Request;
use Tests\TestCase;

class AttachFrontendTokenTest extends TestCase
{
    public function test_supported_portal_cookie_is_added_as_bearer_before_route_authentication(): void
    {
        config(['app.frontend_token_cookie' => 'portal_session_token']);
        $token = '1|'.str_repeat('a', 40);
        $request = Request::create('/api/v1/auth/me', 'GET', [], [
            'portal_session_token' => $token,
        ]);

        $middleware = new AttachFrontendToken;
        $response = $middleware->handle($request, function (Request $nextRequest) use ($token) {
            $this->assertSame('Bearer '.$token, $nextRequest->headers->get('Authorization'));
            $this->assertSame('Bearer '.$token, $nextRequest->server->get('HTTP_AUTHORIZATION'));
            $this->assertSame($token, $nextRequest->bearerToken());

            return response()->noContent();
        });

        $this->assertSame(204, $response->getStatusCode());
    }

    public function test_legacy_wajo_cookie_is_accepted_when_a_generic_cookie_name_is_configured(): void
    {
        config(['app.frontend_token_cookie' => 'portal_session_token']);
        $token = '1|'.str_repeat('b', 40);
        $request = Request::create('/api/v1/portal/profile', 'PATCH', [], [
            'wajo_portal_token' => $token,
        ]);

        $middleware = new AttachFrontendToken;
        $response = $middleware->handle($request, function (Request $nextRequest) use ($token) {
            $this->assertSame('Bearer '.$token, $nextRequest->headers->get('Authorization'));
            $this->assertSame($token, $nextRequest->bearerToken());

            return response()->noContent();
        });

        $this->assertSame(204, $response->getStatusCode());
    }

    public function test_public_api_paths_do_not_promote_frontend_cookie_to_bearer(): void
    {
        config(['app.frontend_token_cookie' => 'portal_session_token']);
        $token = '1|'.str_repeat('a', 40);
        $request = Request::create('/api/v1/public/stats', 'GET', [], [
            'portal_session_token' => $token,
        ]);

        $middleware = new AttachFrontendToken;
        $response = $middleware->handle($request, function (Request $nextRequest) {
            $this->assertNull($nextRequest->bearerToken());

            return response()->noContent();
        });

        $this->assertSame(204, $response->getStatusCode());
    }
}
