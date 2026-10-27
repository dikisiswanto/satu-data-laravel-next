<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Bcrypt only considers the first 72 bytes of a password. Reject longer byte
 * sequences (including multibyte Unicode input) rather than silently accepting
 * different passwords with an identical bcrypt prefix.
 */
final class MaxPasswordBytes implements ValidationRule
{
    public function __construct(private readonly int $maxBytes = 72) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && strlen($value) > $this->maxBytes) {
            $fail('The password must not exceed '.$this->maxBytes.' bytes when using the configured password hasher.');
        }
    }
}
