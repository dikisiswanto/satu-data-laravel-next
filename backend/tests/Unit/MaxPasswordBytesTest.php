<?php

namespace Tests\Unit;

use App\Rules\MaxPasswordBytes;
use PHPUnit\Framework\TestCase;

final class MaxPasswordBytesTest extends TestCase
{
    public function test_accepts_a_password_at_the_bcrypt_byte_limit(): void
    {
        $failure = null;
        (new MaxPasswordBytes)->validate('password', str_repeat('a', 72), function (string $message) use (&$failure): void {
            $failure = $message;
        });

        self::assertNull($failure);
    }

    public function test_rejects_passwords_that_exceed_the_bcrypt_byte_limit(): void
    {
        $failure = null;
        (new MaxPasswordBytes)->validate('password', str_repeat('a', 73), function (string $message) use (&$failure): void {
            $failure = $message;
        });

        self::assertNotNull($failure);
        self::assertStringContainsString('72 bytes', $failure);
    }

    public function test_limit_counts_bytes_not_unicode_characters(): void
    {
        $failure = null;
        (new MaxPasswordBytes)->validate('password', str_repeat('é', 37), function (string $message) use (&$failure): void {
            $failure = $message;
        });

        self::assertNotNull($failure);
    }
}
