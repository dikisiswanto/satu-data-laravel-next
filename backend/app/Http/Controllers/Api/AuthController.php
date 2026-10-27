<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\User;
use App\Rules\MaxPasswordBytes;
use App\Services\AccessService;
use App\Services\AuditService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request, AccessService $access, AuditService $audit): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email:rfc', 'max:254'], 'password' => ['required', 'string', 'max:256', new MaxPasswordBytes]]);
        $email = mb_strtolower(trim($data['email']));
        $ipKey = 'auth-login:ip:'.hash('sha256', (string) $request->ip());
        $pairKey = 'auth-login:pair:'.hash('sha256', (string) $request->ip().'|'.$email);
        $ipLimit = (int) config('satu_data.auth.login_ip_max_attempts', 30);
        $pairLimit = (int) config('satu_data.auth.login_email_max_attempts', 5);
        $decay = (int) config('satu_data.auth.login_decay_seconds', 900);
        if (RateLimiter::tooManyAttempts($ipKey, $ipLimit) || RateLimiter::tooManyAttempts($pairKey, $pairLimit)) {
            $retryAfter = max(RateLimiter::availableIn($ipKey), RateLimiter::availableIn($pairKey), 1);

            return response()->json(['error' => 'too_many_login_attempts', 'retry_after' => $retryAfter], 429, [
                'Cache-Control' => 'no-store', 'Retry-After' => (string) $retryAfter,
            ]);
        }

        $user = User::query()->where('email', $email)->first();
        // Verify a dummy bcrypt hash when the email is unknown to reduce account enumeration by timing.
        $storedHash = $user?->password ?? '$2y$12$SsQZTXLDtgC8r/uU1Ybwa.nhNz5CiZT9jmlYMDq6HmTfhP1iqrBwG';
        $passwordMatches = Hash::check($data['password'], $storedHash);
        if (! $user || ! $passwordMatches || ! $user->is_active) {
            RateLimiter::hit($ipKey, $decay);
            RateLimiter::hit($pairKey, $decay);
            if (RateLimiter::attempts($pairKey) === 1) {
                $audit->record($user?->id, 'account.login', 'user', $user?->id, null, 'denied', ['reason' => 'invalid_credentials']);
            }
            throw ValidationException::withMessages(['email' => ['invalid_credentials']]);
        }
        // Clear only this account+IP pair. Keep the IP bucket intact so a successful
        // login for one account cannot reset protection against password spraying
        // across many accounts from the same source.
        RateLimiter::clear($pairKey);
        $token = $user->createToken('nextjs-portal', ['*'], now()->addDays((int) config('satu_data.frontend_token_ttl_days', 14)));
        $profile = Profile::query()->firstOrCreate(['user_id' => $user->id], ['display_name' => $user->display_name ?: Str::before($user->email, '@'), 'is_active' => true]);
        $audit->record($user->id, 'account.login', 'user', $user->id, null, 'success', ['channel' => 'portal']);

        return response()->json(['data' => ['token' => $token->plainTextToken, 'token_type' => 'Bearer', 'expires_at' => $token->accessToken->expires_at, 'user' => $this->serializeUser($user, $profile, $access)]], 200, ['Cache-Control' => 'no-store']);
    }

    public function me(Request $request, AccessService $access): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && $user->is_active, 401, 'unauthorized');
        $profile = Profile::query()->where('user_id', $user->id)->first();

        return response()->json(['data' => $this->serializeUser($user, $profile, $access)], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function logout(Request $request, AuditService $audit): JsonResponse
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }
        if ($user) {
            $audit->record($user->id, 'account.logout', 'user', $user->id, null, 'success', ['channel' => 'portal']);
        }

        return response()->json(['data' => ['logged_out' => true]], 200, ['Cache-Control' => 'no-store']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email:rfc', 'max:254']]);
        // Always return the same response to avoid account enumeration. Never
        // expose reset tokens/URLs in API output or log raw mail exceptions.
        try {
            Password::sendResetLink(['email' => mb_strtolower(trim($data['email']))]);
        } catch (\Throwable $exception) {
            Log::error('Password-reset delivery failed', ['exception_class' => $exception::class]);
        }

        return response()->json([
            'data' => ['accepted' => true],
            'message' => 'Jika akun terdaftar, instruksi pemulihan akan dikirim.',
        ], 202, ['Cache-Control' => 'no-store']);
    }

    public function resetPassword(Request $request, AuditService $audit): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string'], 'email' => ['required', 'email:rfc', 'max:254'], 'password' => ['required', 'string', 'min:12', 'max:128', new MaxPasswordBytes, 'regex:/[a-z]/', 'regex:/[A-Z]/', 'regex:/[0-9]/', 'confirmed']]);
        $status = Password::reset($data, function (User $user, string $password) use ($audit): void {
            $user->forceFill(['password' => $password])->save();
            $user->tokens()->delete();
            event(new PasswordReset($user));
            $audit->record($user->id, 'account.password_reset', 'user', $user->id, null, 'success');
        });
        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['error' => 'password_reset_failed'], 422, ['Cache-Control' => 'no-store']);
        }

        return response()->json(['data' => ['reset' => true]], 200, ['Cache-Control' => 'no-store']);
    }

    private function serializeUser(User $user, ?Profile $profile, AccessService $access): array
    {
        return [
            'id' => $user->id,
            'email' => $user->email,
            'display_name' => $profile?->display_name ?: $user->display_name,
            'is_active' => (bool) $user->is_active,
            'onboarding_completed_at' => $profile?->onboarding_completed_at?->toISOString() ?? $user->onboarding_completed_at?->toISOString(),
            'roles' => $access->roles($user),
            'memberships' => $access->memberships($user),
        ];
    }
}
