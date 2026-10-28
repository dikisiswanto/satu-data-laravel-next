<?php

namespace Tests\Feature;

use Tests\TestCase;

class PublicApiContractTest extends TestCase
{
    public function test_openapi_contract_is_exposed_without_authentication(): void
    {
        $this->getJson('/api/openapi')
            ->assertOk()
            ->assertJsonPath('openapi', '3.1.0')
            ->assertJsonPath('info.title', 'Portal Satu Data API')
            ->assertJsonStructure(['paths' => [
                '/api/v1/datasets',
                '/api/v1/datasets/{slug}',
                '/api/v1/portal/audit-logs',
                '/api/v1/portal/data-quality/summary',
                '/api/v1/portal/sdi/registry/entries',
                '/api/health',
            ]]);
    }

    public function test_openapi_yaml_contract_is_exposed_without_authentication(): void
    {
        $this->get('/api/openapi.yaml')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/yaml; charset=UTF-8')
            ->assertSee('openapi: 3.1.0')
            ->assertSee('/api/v1/portal/sdi/registry/entries');
    }

    public function test_legacy_portal_path_is_marked_deprecated_in_openapi(): void
    {
        $response = $this->getJson('/api/openapi.json')->assertOk();
        $response->assertJsonPath('paths./api/v1/portal/sdi-registry.post.deprecated', true);
        $response->assertJsonPath('paths./api/v1/portal/sdi/registry/entries.post.deprecated', null);
    }

    public function test_login_validates_payload_before_database_lookup(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'not-an-email', 'password' => 'pass'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }
}
