<?php

namespace App\Console\Commands;

use App\Models\OrganizationMembership;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateBootstrapAdmin extends Command
{
    protected $signature = 'app:create-admin {email : Email for the first administrator} {--name= : Display name}';

    protected $description = 'Create the first global super administrator for a fresh installation';

    public function handle(): int
    {
        if (OrganizationMembership::query()->whereNull('organization_id')->where('role', 'super_admin')->where('is_active', true)
            ->whereHas('user', fn ($query) => $query->where('is_active', true))->exists()) {
            $this->components->error('A super administrator already exists. This bootstrap command is disabled after first setup.');

            return self::FAILURE;
        }

        $email = mb_strtolower(trim((string) $this->argument('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->components->error('A valid email address is required.');

            return self::FAILURE;
        }
        if (User::query()->where('email', $email)->exists()) {
            $this->components->error('That email already exists. Use the legacy data import or the portal invitation workflow.');

            return self::FAILURE;
        }

        $name = trim((string) ($this->option('name') ?: $this->ask('Administrator display name', Str::before($email, '@'))));
        $password = (string) $this->secret('Set a password (minimum 12 characters)');
        $confirmation = (string) $this->secret('Confirm password');
        if (mb_strlen($password) < 12 || strlen($password) > 72 || $password !== $confirmation || ! preg_match('/[a-z]/', $password) || ! preg_match('/[A-Z]/', $password) || ! preg_match('/[0-9]/', $password)) {
            $this->components->error('Passwords must match, contain at least 12 characters (maximum 72 bytes with bcrypt), and include lowercase, uppercase, and a digit.');

            return self::FAILURE;
        }
        if (! $this->confirm('Create the first global super administrator?')) {
            return self::FAILURE;
        }

        DB::transaction(function () use ($email, $name, $password): void {
            $user = User::query()->create(['email' => $email, 'password' => $password, 'display_name' => $name, 'is_active' => true, 'email_verified_at' => now(), 'onboarding_completed_at' => now()]);
            Profile::query()->create(['user_id' => $user->id, 'display_name' => $name, 'is_active' => true, 'onboarding_completed_at' => now()]);
            OrganizationMembership::query()->create(['user_id' => $user->id, 'organization_id' => null, 'role' => 'super_admin', 'is_active' => true, 'created_by' => $user->id]);
            DB::table('audit_logs')->insert(['actor_user_id' => $user->id, 'action' => 'account.bootstrap_admin_created', 'entity_type' => 'user', 'entity_id' => $user->id, 'organization_id' => null, 'outcome' => 'success', 'summary' => json_encode(['bootstrap' => true]), 'created_at' => now()]);
        });

        $this->components->info('Administrator created. Store the credentials securely and remove any temporary deployment shell access.');

        return self::SUCCESS;
    }
}
