<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

class OpenApiController extends Controller
{
    public function __invoke()
    {
        return $this->json();
    }

    public function json()
    {
        $specPath = base_path('openapi/openapi.json');
        abort_unless(is_file($specPath), 500, 'OpenAPI specification is not available.');
        $spec = json_decode((string) file_get_contents($specPath), true, 512, JSON_THROW_ON_ERROR);
        $serverUrl = trim((string) config('app.api_public_url', config('app.url', 'http://localhost:8000')));
        $spec['servers'] = [['url' => rtrim($serverUrl, '/'), 'description' => 'Public API origin; paths include the /api prefix.']];

        return response()->json($spec, 200, ['Cache-Control' => 'public, max-age=60']);
    }

    public function yaml(): Response
    {
        $specPath = base_path('openapi/openapi.yaml');
        abort_unless(is_file($specPath), 500, 'OpenAPI YAML specification is not available.');
        $yaml = (string) file_get_contents($specPath);
        $serverUrl = trim((string) config('app.api_public_url', config('app.url', 'http://localhost:8000')));
        $yaml = str_replace('url: http://localhost:8000', 'url: '.rtrim($serverUrl, '/'), $yaml);

        return response($yaml, 200, [
            'Content-Type' => 'application/yaml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=60',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
