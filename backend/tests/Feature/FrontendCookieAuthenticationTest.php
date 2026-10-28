<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FrontendCookieAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.frontend_token_cookie' => 'portal_session_token']);
    }

    public function test_repeated_session_verification_is_not_limited_by_login_attempt_throttle(): void
    {
        $user = User::query()->create([
            'email' => 'session-check@example.gov.id',
            'password' => 'a-long-test-password',
            'display_name' => 'Session Check',
            'is_active' => true,
        ]);
        $token = $user->createToken('browser-session', ['*'], now()->addMinutes(10))->plainTextToken;

        // Laravel's JSON testing client omits cookies unless withCredentials() is enabled.
        // This mirrors the same-origin browser request that carries the HttpOnly session cookie.
        for ($attempt = 0; $attempt < 12; $attempt++) {
            $this->withHeaders(['Accept' => 'application/json'])
                ->withUnencryptedCookie('portal_session_token', $token)
                ->withCredentials()
                ->getJson('/api/v1/auth/me')
                ->assertOk()
                ->assertJsonPath('data.email', 'session-check@example.gov.id');
        }
    }

    public function test_browser_profile_mutation_authenticates_from_frontend_cookie_without_bearer_header(): void
    {
        $user = User::query()->create([
            'email' => 'cookie-auth@example.gov.id',
            'password' => 'a-long-test-password',
            'display_name' => 'Cookie Auth',
            'is_active' => true,
        ]);
        $token = $user->createToken('browser-session', ['*'], now()->addMinutes(10))->plainTextToken;

        $this->withHeaders([
            'Accept' => 'application/json',
            'Origin' => config('satu_data.frontend_url', 'http://localhost:3000'),
        ])->withUnencryptedCookie('portal_session_token', $token)
            ->withCredentials()
            ->patchJson('/api/v1/portal/profile', [
                'display_name' => 'Cookie Auth Updated',
            ])
            ->assertOk()
            ->assertJsonPath('data.display_name', 'Cookie Auth Updated');

        $this->assertDatabaseHas('profiles', [
            'user_id' => $user->id,
            'display_name' => 'Cookie Auth Updated',
        ]);
    }
}
