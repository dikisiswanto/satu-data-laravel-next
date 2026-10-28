<?php

namespace App\Console\Commands;

use App\Jobs\ProcessDatasetConversion;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PDO;
use PDOException;
use Throwable;

/**
 * One-time, resumable importer for a legacy Supabase PostgreSQL database.
 * It reads an explicit table allow-list and only transfers columns present in
 * both schemas. The legacy database connection must be read-only in production.
 */
class ImportLegacySupabase extends Command
{
    protected $signature = 'legacy:import-supabase
        {--dry-run : Report source and target counts without writing data}
        {--storage-root= : Path containing exported dataset-files objects, preserving object paths}
        {--skip-storage : Do not copy exported objects into Laravel private storage}';

    protected $description = 'Import users and portal data from the previous Supabase PostgreSQL database';

    /** @var array<string, array{schema:string, source:string, keys:array<int,string>}> */
    private array $tables = [
        'users' => ['schema' => 'auth', 'source' => 'users', 'keys' => ['id']],
        'organizations' => ['schema' => 'public', 'source' => 'organizations', 'keys' => ['id']],
        'profiles' => ['schema' => 'public', 'source' => 'profiles', 'keys' => ['user_id']],
        'organization_memberships' => ['schema' => 'public', 'source' => 'organization_memberships', 'keys' => ['id']],
        'datasets' => ['schema' => 'public', 'source' => 'datasets', 'keys' => ['id']],
        // Versions must be imported before resources because resources reference
        // the composite key (dataset_id, version). source_resource_id is restored
        // in a later pass to resolve the reverse edge in this intentional FK cycle.
        'dataset_versions' => ['schema' => 'public', 'source' => 'dataset_versions', 'keys' => ['id']],
        'dataset_resources' => ['schema' => 'public', 'source' => 'dataset_resources', 'keys' => ['id']],
        'dataset_validation_runs' => ['schema' => 'public', 'source' => 'dataset_validation_runs', 'keys' => ['id']],
        'dataset_resource_rows' => ['schema' => 'public', 'source' => 'dataset_resource_rows', 'keys' => ['resource_id', 'row_number']],
        'conversion_jobs' => ['schema' => 'public', 'source' => 'conversion_jobs', 'keys' => ['id']],
        'indicators' => ['schema' => 'public', 'source' => 'indicators', 'keys' => ['id']],
        'indicator_observations' => ['schema' => 'public', 'source' => 'indicator_observations', 'keys' => ['id']],
        // Metadata references these catalog records through FKs in the target schema.
        // Import the parent catalogs before importing metadata; reference entries
        // themselves depend on reference_code_systems.
        'sdi_standard_registry' => ['schema' => 'public', 'source' => 'sdi_standard_registry', 'keys' => ['id']],
        'reference_code_systems' => ['schema' => 'public', 'source' => 'reference_code_systems', 'keys' => ['id']],
        'reference_code_entries' => ['schema' => 'public', 'source' => 'reference_code_entries', 'keys' => ['id']],
        'dataset_sdi_metadata' => ['schema' => 'public', 'source' => 'dataset_sdi_metadata', 'keys' => ['dataset_id', 'dataset_version']],
        'sdi_harvest_runs' => ['schema' => 'public', 'source' => 'sdi_harvest_runs', 'keys' => ['id']],
        'audit_logs' => ['schema' => 'public', 'source' => 'audit_logs', 'keys' => ['id']],
    ];

    public function handle(): int
    {
        $url = trim((string) config('satu_data.legacy_supabase_database_url', ''));
        if ($url === '') {
            $this->components->error('LEGACY_SUPABASE_DATABASE_URL belum disetel pada backend/.env.');

            return self::FAILURE;
        }

        try {
            $source = $this->connectSource($url);
            $source->exec('SET default_transaction_read_only = on');
        } catch (Throwable $error) {
            $this->components->error('Koneksi database lama gagal. Periksa URL, akses jaringan, TLS, dan hak baca akun migrasi.');
            report($error);

            return self::FAILURE;
        }

        if (! $this->option('dry-run')) {
            if (! $this->confirm('Anda sudah mencadangkan database lama dan mengarahkan Laravel ke database BARU yang benar?')) {
                $this->components->warn('Dibatalkan. Tidak ada data yang ditulis.');

                return self::SUCCESS;
            }
        }

        $this->info($this->option('dry-run') ? 'Pemeriksaan pramigrasi (dry run)' : 'Impor data Supabase → Laravel dimulai');
        $sourceColumnCache = [];
        $targetColumnCache = [];
        $rowCounts = [];
        foreach ($this->tables as $targetTable => $config) {
            try {
                if (! Schema::hasTable($targetTable)) {
                    $this->components->warn("Lewati {$targetTable}: tabel target tidak ada di schema Laravel.");

                    continue;
                }
                if (! isset($sourceColumnCache[$config['schema'].'.'.$config['source']])) {
                    $sourceColumnCache[$config['schema'].'.'.$config['source']] = $this->sourceColumns($source, $config['schema'], $config['source']);
                }
                $sourceColumns = $sourceColumnCache[$config['schema'].'.'.$config['source']];
                if ($sourceColumns === []) {
                    $this->components->warn("Lewati {$config['schema']}.{$config['source']}: tabel sumber tidak ada.");

                    continue;
                }
                $targetColumns = $targetColumnCache[$targetTable] ??= Schema::getColumnListing($targetTable);
                $sourceCount = $this->sourceCount($source, $config['schema'], $config['source']);
                $targetCount = DB::table($targetTable)->count();
                $rowCounts[$targetTable] = ['source' => $sourceCount, 'before' => $targetCount];
                $this->line(sprintf('%-30s source: %7d | target sebelumnya: %7d', $targetTable, $sourceCount, $targetCount));

                if ($this->option('dry-run') || $sourceCount === 0) {
                    continue;
                }
                if ($targetTable === 'users') {
                    $this->importUsers($source, $sourceColumns, $targetColumns);
                } else {
                    $this->importTable($source, $config, $sourceColumns, $targetColumns);
                }
            } catch (Throwable $error) {
                $this->components->error("Impor tabel {$targetTable} gagal. Implikasi perubahan dapat parsial, tetapi perintah bisa diulang.");
                report($error);

                return self::FAILURE;
            }
        }

        if ($this->option('dry-run')) {
            $this->components->info('Dry run selesai. Tidak ada perubahan database.');

            return self::SUCCESS;
        }

        // The version/resource relationship is intentionally cyclic: importing versions with a null
        // source_resource_id makes their composite key available, then resources can be inserted,
        // and the nullable reverse reference is restored after both tables exist.
        $this->restoreVersionResourceReferences($source);
        $this->resetSequence('audit_logs', 'id');
        $this->copyExportedStorage();
        $this->requeueRecoverableConversions();
        $this->newLine();
        $this->components->info('Impor data selesai. Jalankan pemeriksaan jumlah, login, unduhan, preview, dan satu konversi contoh sebelum cutover.');

        return self::SUCCESS;
    }

    private function connectSource(string $url): PDO
    {
        $parts = parse_url($url);
        if (! is_array($parts) || ! isset($parts['host'], $parts['path'])) {
            throw new PDOException('invalid legacy PostgreSQL URL');
        }
        $scheme = strtolower((string) ($parts['scheme'] ?? 'postgresql'));
        if (! in_array($scheme, ['postgres', 'postgresql', 'pgsql'], true)) {
            throw new PDOException('legacy URL must use PostgreSQL');
        }
        parse_str((string) ($parts['query'] ?? ''), $query);
        $sslMode = preg_replace('/[^a-z]/', '', (string) ($query['sslmode'] ?? 'require')) ?: 'require';
        $host = $parts['host'];
        $port = (int) ($parts['port'] ?? 5432);
        $database = ltrim((string) $parts['path'], '/');
        $username = urldecode((string) ($parts['user'] ?? ''));
        $password = urldecode((string) ($parts['pass'] ?? ''));
        if ($username === '' || $database === '') {
            throw new PDOException('legacy URL misses user or database');
        }
        $pdo = new PDO("pgsql:host={$host};port={$port};dbname={$database};sslmode={$sslMode}", $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        return $pdo;
    }

    /** @return array<int,string> */
    private function sourceColumns(PDO $source, string $schema, string $table): array
    {
        $statement = $source->prepare('SELECT column_name FROM information_schema.columns WHERE table_schema = :schema AND table_name = :table ORDER BY ordinal_position');
        $statement->execute(['schema' => $schema, 'table' => $table]);

        return array_map('strval', $statement->fetchAll(PDO::FETCH_COLUMN));
    }

    private function sourceCount(PDO $source, string $schema, string $table): int
    {
        $statement = $source->query('SELECT COUNT(*) FROM '.$this->quoteIdentifier($schema).'.'.$this->quoteIdentifier($table));

        return (int) $statement->fetchColumn();
    }

    private function importUsers(PDO $source, array $sourceColumns, array $targetColumns): void
    {
        $availableTarget = array_flip($targetColumns);
        $selected = array_values(array_intersect($sourceColumns, [
            'id', 'email', 'encrypted_password', 'email_confirmed_at', 'confirmed_at', 'created_at', 'updated_at', 'banned_until', 'raw_user_meta_data',
        ]));
        if (! in_array('id', $selected, true) || ! in_array('email', $selected, true)) {
            throw new PDOException('auth.users requires id and email columns');
        }
        $statement = $source->query('SELECT '.$this->quoteColumns($selected).' FROM "auth"."users" WHERE email IS NOT NULL ORDER BY id');
        $batch = [];
        $count = 0;
        while ($row = $statement->fetch(PDO::FETCH_ASSOC)) {
            $metadata = $row['raw_user_meta_data'] ?? null;
            if (is_string($metadata)) {
                $metadata = json_decode($metadata, true) ?: [];
            }
            if (! is_array($metadata)) {
                $metadata = [];
            }
            $email = mb_strtolower(trim((string) ($row['email'] ?? '')));
            if ($email === '') {
                continue;
            }
            $values = [
                'id' => (string) $row['id'],
                'email' => $email,
                'password' => (string) (($row['encrypted_password'] ?? '') ?: Str::random(64)),
                'email_verified_at' => $row['email_confirmed_at'] ?? $row['confirmed_at'] ?? null,
                'is_active' => empty($row['banned_until']) || strtotime((string) $row['banned_until']) < time(),
                'display_name' => $metadata['display_name'] ?? $metadata['full_name'] ?? $metadata['name'] ?? Str::before($email, '@'),
                'created_at' => $row['created_at'] ?? now(),
                'updated_at' => $row['updated_at'] ?? now(),
            ];
            $batch[] = array_intersect_key($values, $availableTarget);
            if (count($batch) >= 250) {
                $this->upsertBatch('users', $batch, ['id']);
                $count += count($batch);
                $batch = [];
            }
        }
        if ($batch !== []) {
            $this->upsertBatch('users', $batch, ['id']);
            $count += count($batch);
        }
        $this->line("  → akun yang disalin/diperbarui: {$count}");
    }

    private function importTable(PDO $source, array $config, array $sourceColumns, array $targetColumns): void
    {
        $columns = array_values(array_intersect($targetColumns, $sourceColumns));
        if ($columns === []) {
            throw new PDOException('No compatible columns between source and target');
        }

        // The relationship is restored after dataset_resources has been copied.
        if ($config['source'] === 'dataset_versions') {
            $columns = array_values(array_diff($columns, ['source_resource_id']));
        }
        $statement = $source->query('SELECT '.$this->quoteColumns($columns).' FROM '.$this->quoteIdentifier($config['schema']).'.'.$this->quoteIdentifier($config['source']));
        $batch = [];
        $imported = 0;
        while ($row = $statement->fetch(PDO::FETCH_ASSOC)) {
            $values = [];
            foreach ($columns as $column) {
                $value = $row[$column] ?? null;
                if ($column === 'summary' || $column === 'sample_issues' || $column === 'checks' || $column === 'metadata_snapshot' || $column === 'column_schema' || $column === 'keywords' || $column === 'publication_check' || $column === 'presentation_classification' || $column === 'dimensions' || $column === 'row_data') {
                    if (is_array($value)) {
                        $value = json_encode($value, JSON_THROW_ON_ERROR);
                    }
                }
                $values[$column] = $value;
            }
            if ($config['source'] === 'organization_memberships') {
                $role = (string) ($values['role'] ?? '');
                $organizationId = $values['organization_id'] ?? null;
                $globalRole = in_array($role, ['super_admin', 'data_admin', 'auditor'], true);
                if ($globalRole !== ($organizationId === null)) {
                    throw new PDOException('Invalid role/organization scope in legacy membership for user '.($values['user_id'] ?? '(unknown)').'. Global roles must have no organization; organization roles require one.');
                }
                $values['scope_key'] = $organizationId ?: '__global__';
            }
            if ($config['source'] === 'profiles' && empty($values['display_name'])) {
                $values['display_name'] = DB::table('users')->where('id', $values['user_id'] ?? null)->value('display_name') ?: 'Pengguna Portal';
            }
            if ($config['source'] === 'conversion_jobs' && isset($values['status']) && $values['status'] === 'processing') {
                $values['status'] = 'queued';
                $values['worker_id'] = null;
                $values['lease_expires_at'] = null;
                $values['finished_at'] = null;
            }
            $batch[] = $values;
            if (count($batch) >= 250) {
                $this->upsertBatch($config['source'], $batch, $config['keys']);
                $imported += count($batch);
                $batch = [];
            }
        }
        if ($batch !== []) {
            $this->upsertBatch($config['source'], $batch, $config['keys']);
            $imported += count($batch);
        }
        $this->line("  → baris disalin/diperbarui: {$imported}");
    }

    private function upsertBatch(string $table, array $rows, array $keys): void
    {
        if ($rows === []) {
            return;
        }
        // Keep a common column set for the bulk SQL statement.
        $columns = array_keys($rows[0]);
        $normalized = array_map(fn ($row) => array_replace(array_fill_keys($columns, null), $row), $rows);
        $updates = array_values(array_diff($columns, $keys));
        DB::transaction(function () use ($table, $normalized, $keys, $updates): void {
            DB::table($table)->upsert($normalized, $keys, $updates);
        });
    }

    private function restoreVersionResourceReferences(PDO $source): void
    {
        $columns = $this->sourceColumns($source, 'public', 'dataset_versions');
        if (! in_array('source_resource_id', $columns, true)) {
            return;
        }
        foreach (['id', 'dataset_id', 'version'] as $requiredColumn) {
            if (! in_array($requiredColumn, $columns, true)) {
                $this->components->warn('Referensi sumber versi tidak dipulihkan: tabel legacy dataset_versions tidak memiliki kolom '.$requiredColumn.'.');

                return;
            }
        }

        $statement = $source->query('SELECT id, source_resource_id, dataset_id, version FROM "public"."dataset_versions" WHERE source_resource_id IS NOT NULL');
        $updated = 0;
        $scopeMismatches = 0;
        while ($row = $statement->fetch(PDO::FETCH_ASSOC)) {
            $version = DB::table('dataset_versions')->where('id', $row['id'])->first(['dataset_id', 'version']);
            $resource = DB::table('dataset_resources')->where('id', $row['source_resource_id'])->first(['dataset_id', 'dataset_version']);
            if (! $version || ! $resource) {
                continue;
            }

            // The FK intentionally binds the source resource to this exact
            // dataset/version. Do not replay a legacy cross-version pointer and
            // let it abort the rest of an otherwise resumable import.
            if (strtolower((string) $version->dataset_id) !== strtolower((string) $resource->dataset_id)
                || (int) $version->version !== (int) $resource->dataset_version) {
                $scopeMismatches++;

                continue;
            }

            DB::table('dataset_versions')->where('id', $row['id'])->update(['source_resource_id' => $row['source_resource_id']]);
            $updated++;
        }
        $this->line("  → referensi sumber versi dipulihkan: {$updated}");
        if ($scopeMismatches > 0) {
            $this->components->warn("{$scopeMismatches} referensi sumber versi legacy dilewati karena menunjuk resource dataset/versi yang berbeda. Tinjau data tersebut sebelum cutover.");
        }
    }

    private function copyExportedStorage(): void
    {
        if ($this->option('skip-storage')) {
            return;
        }
        $root = trim((string) $this->option('storage-root'));
        if ($root === '') {
            $this->components->warn('Folder ekspor Storage belum diberikan. Metadata resource tetap diimpor, tetapi berkas belum tersedia di disk privat Laravel.');

            return;
        }
        $rootPath = realpath($root);
        if (! $rootPath || ! is_dir($rootPath)) {
            throw new PDOException('storage-root does not exist');
        }
        $copied = 0;
        $missing = 0;
        foreach (DB::table('dataset_resources')->select('storage_path')->orderBy('id')->cursor() as $resource) {
            $relative = ltrim((string) $resource->storage_path, '/');
            if ($relative === '' || str_contains($relative, '..')) {
                $missing++;

                continue;
            }
            $sourcePath = $rootPath.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);
            if (! is_file($sourcePath)) {
                $missing++;

                continue;
            }
            $stream = fopen($sourcePath, 'rb');
            if (! $stream) {
                $missing++;

                continue;
            }
            try {
                $ok = Storage::disk('private')->writeStream($relative, $stream);
            } finally {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }
            if ($ok) {
                $copied++;
            } else {
                $missing++;
            }
        }
        $this->line("  → file resource disalin: {$copied}; tidak ditemukan/gagal: {$missing}");
        if ($missing > 0) {
            $this->components->warn('Sebagian file belum tersedia. Dataset yang merujuk file tersebut perlu diperiksa sebelum dipublikasikan.');
        }
    }

    private function requeueRecoverableConversions(): void
    {
        $rows = DB::table('conversion_jobs as j')->join('dataset_resources as r', 'r.id', '=', 'j.source_resource_id')
            ->whereIn('j.status', ['queued', 'processing'])->where('r.is_source', true)
            ->select('j.id', 'r.storage_path')->get();
        $queued = 0;
        foreach ($rows as $row) {
            if (! Storage::disk('private')->exists($row->storage_path)) {
                continue;
            }
            ProcessDatasetConversion::dispatch($row->id)->afterCommit();
            $queued++;
        }
        if ($queued > 0) {
            $this->line("  → job konversi yang memiliki file sumber berhasil dijadwalkan: {$queued}");
        }
    }

    private function resetSequence(string $table, string $column): void
    {
        // MySQL/MariaDB advances AUTO_INCREMENT when explicit integer primary keys
        // are inserted; PostgreSQL requires its sequence to be synchronized.
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }
        try {
            DB::statement("SELECT setval(pg_get_serial_sequence(?, ?), GREATEST(COALESCE((SELECT MAX({$column}) FROM {$table}), 1), 1), true)", [$table, $column]);
        } catch (Throwable) {
            // Tables without a serial sequence need no adjustment.
        }
    }

    private function quoteIdentifier(string $identifier): string
    {
        if (! preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $identifier)) {
            throw new PDOException('unsafe SQL identifier');
        }

        return '"'.$identifier.'"';
    }

    private function quoteColumns(array $columns): string
    {
        if ($columns === []) {
            throw new PDOException('empty column list');
        }

        return implode(', ', array_map(fn ($column) => $this->quoteIdentifier((string) $column), $columns));
    }
}
