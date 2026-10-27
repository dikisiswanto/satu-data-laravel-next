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
    protected $signature = 'app:create-admin {email : Alamat email administrator pertama} {--name= : Nama tampilan}';

    protected $description = 'Membuat administrator super global pertama pada instalasi baru';

    public function handle(): int
    {
        if (OrganizationMembership::query()->whereNull('organization_id')->where('role', 'super_admin')->where('is_active', true)
            ->whereHas('user', fn ($query) => $query->where('is_active', true))->exists()) {
            $this->components->error('Administrator super sudah tersedia. Perintah bootstrap dinonaktifkan setelah penyiapan pertama.');

            return self::FAILURE;
        }

        $email = mb_strtolower(trim((string) $this->argument('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->components->error('Alamat email tidak valid.');

            return self::FAILURE;
        }
        if (User::query()->where('email', $email)->exists()) {
            $this->components->error('Email tersebut sudah terdaftar. Gunakan impor data lama atau alur undangan portal.');

            return self::FAILURE;
        }

        $name = trim((string) ($this->option('name') ?: $this->ask('Nama tampilan administrator', Str::before($email, '@'))));
        $password = (string) $this->secret('Buat kata sandi (minimal 12 karakter)');
        $confirmation = (string) $this->secret('Konfirmasi kata sandi');
        if (mb_strlen($password) < 12 || strlen($password) > 72 || $password !== $confirmation || ! preg_match('/[a-z]/', $password) || ! preg_match('/[A-Z]/', $password) || ! preg_match('/[0-9]/', $password)) {
            $this->components->error('Kata sandi harus sama, minimal 12 karakter (maksimal 72 byte untuk bcrypt), serta memuat huruf kecil, huruf besar, dan angka.');

            return self::FAILURE;
        }
        if (! $this->confirm('Buat administrator super global pertama?')) {
            return self::FAILURE;
        }

        DB::transaction(function () use ($email, $name, $password): void {
            $user = User::query()->create(['email' => $email, 'password' => $password, 'display_name' => $name, 'is_active' => true, 'email_verified_at' => now(), 'onboarding_completed_at' => now()]);
            Profile::query()->create(['user_id' => $user->id, 'display_name' => $name, 'is_active' => true, 'onboarding_completed_at' => now()]);
            OrganizationMembership::query()->create(['user_id' => $user->id, 'organization_id' => null, 'role' => 'super_admin', 'is_active' => true, 'created_by' => $user->id]);
            DB::table('audit_logs')->insert(['actor_user_id' => $user->id, 'action' => 'account.bootstrap_admin_created', 'entity_type' => 'user', 'entity_id' => $user->id, 'organization_id' => null, 'outcome' => 'success', 'summary' => json_encode(['bootstrap' => true]), 'created_at' => now()]);
        });

        $this->components->info('Administrator berhasil dibuat. Simpan kredensial dengan aman dan cabut akses shell deployment sementara.');

        return self::SUCCESS;
    }
}
