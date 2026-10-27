<?php

namespace Tests\Unit;

use App\Http\Middleware\TrustConfiguredProxies;
use Illuminate\Http\Request;
use Tests\TestCase;

class TrustConfiguredProxiesTest extends TestCase
{
    public function test_reads_proxy_configuration_when_handling_a_request(): void
    {
        config(['app.trusted_proxies' => ['127.0.0.1']]);

        $request = Request::create('http://portal.test/', 'GET', [], [], [], [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ]);

        try {
            $response = (new TrustConfiguredProxies)->handle(
                $request,
                static fn (Request $request) => response('ok '.$request->getScheme()),
            );

            $this->assertSame('ok https', $response->getContent());
            $this->assertTrue($request->isSecure());
        } finally {
            Request::setTrustedProxies([], Request::HEADER_X_FORWARDED_FOR);
        }
    }
}
