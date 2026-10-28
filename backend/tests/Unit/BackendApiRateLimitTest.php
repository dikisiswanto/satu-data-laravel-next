<?php

namespace Tests\Unit;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class BackendApiRateLimitTest extends TestCase
{
    public function test_authenticated_api_budget_is_scoped_to_a_hashed_session_token(): void
    {
        $token = str_repeat('session-token-', 3);
        $request = Request::create('https://portal.test/api/v1/portal/shell', 'GET', [], [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'REMOTE_ADDR' => '192.0.2.10',
        ]);

        $limit = $this->backendApiLimit($request);

        $this->assertSame(1200, $limit->maxAttempts);
        $this->assertSame('token:'.hash('sha256', $token), $limit->key);
        $this->assertStringNotContainsString($token, $limit->key);
    }

    public function test_anonymous_api_budget_remains_per_ip(): void
    {
        $request = Request::create('https://portal.test/api/v1/datasets', 'GET', [], [], [], [
            'REMOTE_ADDR' => '192.0.2.11',
        ]);

        $limit = $this->backendApiLimit($request);

        $this->assertSame(120, $limit->maxAttempts);
        $this->assertSame('ip:192.0.2.11', $limit->key);
    }

    public function test_authenticated_portal_budget_allows_normal_admin_navigation_bursts(): void
    {
        $request = Request::create('https://portal.test/api/v1/portal/shell', 'GET');
        $request->setUserResolver(fn () => (object) ['id' => 'admin-user-id']);

        $limiter = RateLimiter::limiter('portal-user');
        $limit = $limiter($request);

        $this->assertInstanceOf(Limit::class, $limit);
        $this->assertSame(1200, $limit->maxAttempts);
        $this->assertSame('user:admin-user-id', $limit->key);
    }

    private function backendApiLimit(Request $request): Limit
    {
        $limiter = RateLimiter::limiter('backend-api');
        $limit = $limiter($request);

        $this->assertInstanceOf(Limit::class, $limit);

        return $limit;
    }
}
