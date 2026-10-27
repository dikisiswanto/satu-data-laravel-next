<?php

namespace App\Jobs;

use App\Models\ConversionJob;
use App\Models\Dataset;
use App\Models\DatasetResource;
use App\Services\AuditService;
use Dompdf\Dompdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use League\Csv\Reader;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Throwable;

class ProcessDatasetConversion implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout;

    public array $backoff = [30, 120];

    public function __construct(public readonly string $conversionJobId)
    {
        $this->onQueue('conversions');
        $this->timeout = (int) config('satu_data.conversion.job_timeout', 900);
    }

    public function handle(AuditService $audit): void
    {
        $job = DB::transaction(function () {
            $job = ConversionJob::query()->lockForUpdate()->findOrFail($this->conversionJobId);
            if (in_array($job->status, ['succeeded', 'failed', 'cancelled'], true)) {
                return null;
            }
            if ($job->status === 'processing' && $job->lease_expires_at && $job->lease_expires_at->isFuture()) {
                return null;
            }
            $job->status = 'processing';
            $job->attempts = (int) $job->attempts + 1;
            $job->started_at ??= now();
            $job->worker_id = gethostname().':'.getmypid();
            $job->lease_expires_at = now()->addSeconds($this->timeout + 60);
            $job->error_code = null;
            $job->safe_error_message = null;
            $job->save();
            DatasetResource::query()->whereKey($job->source_resource_id)->update(['conversion_status' => 'processing']);

            return $job;
        });
        if (! $job) {
            return;
        }

        $temporarySourcePath = null;
        try {
            $source = DatasetResource::query()->whereKey($job->source_resource_id)->firstOrFail();
            $dataset = Dataset::query()->with('organization')->findOrFail($job->dataset_id);
            $disk = Storage::disk('private');
            if (! $disk->exists($source->storage_path)) {
                throw new \RuntimeException('source_download_failed');
            }
            $inputStream = $disk->readStream($source->storage_path);
            if (! is_resource($inputStream)) {
                throw new \RuntimeException('source_download_failed');
            }
            $temporarySourcePath = tempnam(sys_get_temp_dir(), 'satu-data-wajo-');
            if (! is_string($temporarySourcePath)) {
                fclose($inputStream);
                throw new \RuntimeException('temporary_storage_unavailable');
            }
            $temporaryOutput = fopen($temporarySourcePath, 'wb');
            if (! is_resource($temporaryOutput)) {
                fclose($inputStream);
                throw new \RuntimeException('temporary_storage_unavailable');
            }
            try {
                $copiedBytes = stream_copy_to_stream($inputStream, $temporaryOutput);
            } finally {
                fclose($inputStream);
                fclose($temporaryOutput);
            }
            if ($copiedBytes === false || $copiedBytes !== (int) $source->size_bytes) {
                throw new \RuntimeException('source_size_invalid');
            }
            $path = $temporarySourcePath;
            $actualChecksum = hash_file('sha256', $path);
            if ($source->checksum_sha256 && ! hash_equals($source->checksum_sha256, $actualChecksum)) {
                throw new \RuntimeException('source_checksum_mismatch');
            }
            if ((int) $source->size_bytes < 1 || (int) $source->size_bytes > 25 * 1024 * 1024) {
                throw new \RuntimeException('source_size_invalid');
            }

            [$rows, $headers, $geojson] = $this->parseSource($path, $source->format);
            if (count($rows) < 1) {
                throw new \RuntimeException('source_empty');
            }
            $maxRows = (int) config('satu_data.conversion.max_rows', 100000);
            $maxColumns = (int) config('satu_data.conversion.max_columns', 100);
            $maxCells = (int) config('satu_data.conversion.max_cells', 200000);
            if (count($rows) > $maxRows) {
                throw new \RuntimeException('source_row_limit');
            }
            if (count($headers) > $maxColumns) {
                throw new \RuntimeException('source_column_limit');
            }
            if (count($rows) * max(1, count($headers)) > $maxCells) {
                throw new \RuntimeException('source_cell_limit');
            }
            $this->assertTabularShape($rows, $headers);

            $outputs = $this->buildOutputs($rows, $headers, $geojson, $source);
            $createdResources = [];
            foreach ($outputs as $format => $output) {
                $checksum = hash('sha256', $output['bytes']);
                if (strlen($output['bytes']) > (int) config('satu_data.conversion.max_output_bytes', 26214400)) {
                    throw new \RuntimeException('output_size_limit_'.$format);
                }
                $targetPath = $dataset->organization_id.'/'.$dataset->id.'/v'.$job->dataset_version.'/generated/'.$checksum.'.'.$format;
                $existing = DatasetResource::query()->where('storage_path', $targetPath)->first();
                // Avoid a redundant object-store write on retries, but repair a missing object.
                if ((! $existing || ! $disk->exists($targetPath)) && ! $disk->put($targetPath, $output['bytes'])) {
                    throw new \RuntimeException('conversion_output_write_failed');
                }
                $resource = $existing ?: DatasetResource::query()->create([
                    'dataset_id' => $dataset->id,
                    'dataset_version' => $job->dataset_version,
                    'storage_path' => $targetPath,
                    'original_filename' => $output['filename'],
                    'format' => $format,
                    'mime_type' => $output['mime'],
                    'size_bytes' => strlen($output['bytes']),
                    'checksum_sha256' => $checksum,
                    'is_source' => false,
                    'is_public' => false,
                    'conversion_status' => 'succeeded',
                    'converter_version' => 'laravel-converter/1.0.0',
                    'created_by' => $job->requested_by,
                    'row_count' => count($rows),
                    'column_schema' => $headers,
                    'preview_enabled' => $format === 'csv',
                    'created_at' => now(),
                ]);
                $createdResources[] = $resource;
            }

            $csv = collect($createdResources)->first(fn ($resource) => $resource->format === 'csv');
            if ($csv) {
                $this->storePreviewRows($csv->id, $rows, $headers);
            }

            DB::transaction(function () use ($job, $source, $dataset, $audit, $rows, $headers, $createdResources, $actualChecksum): void {
                DB::table('dataset_validation_runs')->insert([
                    'id' => (string) Str::uuid(), 'dataset_id' => $dataset->id,
                    'dataset_version' => $job->dataset_version, 'source_checksum_sha256' => $actualChecksum,
                    'status' => 'passed', 'checks' => json_encode(['source_checksum' => true, 'row_count' => count($rows), 'column_count' => count($headers), 'outputs' => array_map(fn ($r) => $r->format, $createdResources)], JSON_THROW_ON_ERROR),
                    'converter_version' => 'laravel-converter/1.0.0', 'worker_run_id' => (string) Str::uuid(), 'created_at' => now(),
                ]);
                $source->update(['conversion_status' => 'succeeded', 'converter_version' => 'laravel-converter/1.0.0', 'row_count' => count($rows), 'column_schema' => $headers]);
                $job->update(['status' => 'succeeded', 'finished_at' => now(), 'lease_expires_at' => null, 'safe_error_message' => null]);
                $audit->record($job->requested_by, 'dataset.convert', 'dataset', $dataset->id, $dataset->organization_id, 'success', ['job_id' => $job->id, 'version' => $job->dataset_version, 'rows' => count($rows), 'outputs' => array_map(fn ($r) => $r->format, $createdResources)]);
            });
        } catch (Throwable $error) {
            $code = preg_match('/^[a-z0-9_]{3,100}$/', $error->getMessage()) ? $error->getMessage() : 'conversion_internal_error';
            Log::warning('dataset_conversion_attempt_failed', ['job_id' => $this->conversionJobId, 'code' => $code, 'attempt' => $job->attempts]);
            if ($this->attempts() < $this->tries && ! str_starts_with($code, 'source_') && ! str_starts_with($code, 'geojson_') && ! str_starts_with($code, 'output_size_limit_') && ! in_array($code, ['source_empty', 'duplicate_headers', 'tabular_shape_invalid', 'json_must_be_array'], true)) {
                DB::transaction(function (): void {
                    $locked = ConversionJob::query()->lockForUpdate()->find($this->conversionJobId);
                    if (! $locked || in_array($locked->status, ['succeeded', 'cancelled'], true)) {
                        return;
                    }
                    $locked->update(['status' => 'queued', 'worker_id' => null, 'lease_expires_at' => null, 'finished_at' => null]);
                    DatasetResource::query()->whereKey($locked->source_resource_id)->where('conversion_status', 'processing')->update(['conversion_status' => 'queued']);
                });
                throw $error;
            }
            $this->markFailed($job, $code, $audit);
        } finally {
            if (is_string($temporarySourcePath) && is_file($temporarySourcePath)) {
                @unlink($temporarySourcePath);
            }
        }
    }

    public function failed(Throwable $error): void
    {
        $job = ConversionJob::query()->find($this->conversionJobId);
        if ($job && $job->status !== 'succeeded') {
            $this->markFailed($job, 'conversion_attempts_exhausted', app(AuditService::class));
        }
    }

    private function markFailed(ConversionJob $job, string $code, AuditService $audit): void
    {
        $message = match (true) {
            $code === 'source_checksum_mismatch' => 'Integritas berkas sumber tidak cocok. Unggah ulang berkas sumber.',
            $code === 'source_empty' => 'Berkas tidak berisi data yang dapat diproses.',
            $code === 'source_row_limit' => 'Jumlah baris melebihi batas pemrosesan. Pecah dataset menjadi beberapa berkas.',
            $code === 'source_column_limit' => 'Jumlah kolom melebihi batas pemrosesan aman.',
            $code === 'duplicate_headers' => 'Nama kolom berulang. Pastikan setiap nama kolom bersifat unik.',
            $code === 'json_must_be_array' => 'JSON harus berisi daftar objek atau baris data.',
            str_starts_with($code, 'output_size_limit_') => 'Hasil konversi melebihi batas ukuran penyimpanan 25 MiB.',
            default => 'Berkas belum berhasil diproses. Periksa struktur berkas dan coba unggah kembali.',
        };
        DB::transaction(function () use ($job, $code, $message, $audit): void {
            $locked = ConversionJob::query()->lockForUpdate()->find($job->id);
            if (! $locked || $locked->status === 'succeeded') {
                return;
            }
            $locked->update(['status' => 'failed', 'error_code' => $code, 'safe_error_message' => $message, 'finished_at' => now(), 'lease_expires_at' => null]);
            DatasetResource::query()->whereKey($locked->source_resource_id)->update(['conversion_status' => 'failed']);
            $dataset = Dataset::query()->find($locked->dataset_id);
            DB::table('dataset_validation_runs')->insert([
                'id' => (string) Str::uuid(), 'dataset_id' => $locked->dataset_id, 'dataset_version' => $locked->dataset_version,
                'source_checksum_sha256' => str_repeat('0', 64), 'status' => 'failed', 'checks' => json_encode(['error_code' => $code], JSON_THROW_ON_ERROR),
                'converter_version' => 'laravel-converter/1.0.0', 'worker_run_id' => (string) Str::uuid(), 'created_at' => now(),
            ]);
            $audit->record($locked->requested_by, 'dataset.convert', 'dataset', $locked->dataset_id, $dataset?->organization_id, 'failure', ['job_id' => $locked->id, 'code' => $code]);
        });
    }

    /** @return array{0: array<int, array<string, mixed>>, 1: array<int, string>, 2: array<string, mixed>|null} */
    private function parseSource(string $path, string $format): array
    {
        if ($format === 'csv') {
            $csv = Reader::createFromPath($path, 'r');
            $csv->setHeaderOffset(0);
            $headers = array_map(fn ($header) => trim((string) $header), $csv->getHeader());
            if (count($headers) !== count(array_unique($headers))) {
                throw new \RuntimeException('duplicate_headers');
            }
            $rows = [];
            $maxRows = (int) config('satu_data.conversion.max_rows', 100000);
            $maxColumns = (int) config('satu_data.conversion.max_columns', 100);
            $maxCells = (int) config('satu_data.conversion.max_cells', 200000);
            if (count($headers) > $maxColumns) {
                throw new \RuntimeException('source_column_limit');
            }
            foreach ($csv->getRecords() as $record) {
                if (count($rows) >= $maxRows) {
                    throw new \RuntimeException('source_row_limit');
                }
                if ((count($rows) + 1) * max(1, count($headers)) > $maxCells) {
                    throw new \RuntimeException('source_cell_limit');
                }
                $rows[] = array_combine($headers, array_values($record));
            }

            return [$rows, $headers, null];
        }
        if ($format === 'xlsx') {
            $this->assertXlsxArchiveBounds($path);
            $reader = IOFactory::createReaderForFile($path);
            $reader->setReadDataOnly(true);
            $worksheetInfo = $reader->listWorksheetInfo($path);
            if (count($worksheetInfo) < 1 || count($worksheetInfo) > 50) {
                throw new \RuntimeException('xlsx_sheet_limit');
            }
            $maxRows = (int) config('satu_data.conversion.max_rows', 100000);
            $maxColumns = (int) config('satu_data.conversion.max_columns', 100);
            $maxCells = (int) config('satu_data.conversion.max_cells', 200000);
            $totalCells = 0;
            foreach ($worksheetInfo as $info) {
                $sheetRows = (int) ($info['totalRows'] ?? 0);
                $sheetColumns = (int) ($info['totalColumns'] ?? 0);
                if ($sheetRows > $maxRows + 1) {
                    throw new \RuntimeException('source_row_limit');
                }
                if ($sheetColumns > $maxColumns) {
                    throw new \RuntimeException('source_column_limit');
                }
                $totalCells += max(0, $sheetRows - 1) * max(1, $sheetColumns);
                if ($totalCells > $maxCells) {
                    throw new \RuntimeException('source_cell_limit');
                }
            }
            $spreadsheet = $reader->load($path);
            $sheet = $spreadsheet->getActiveSheet();
            $highestRow = (int) $sheet->getHighestDataRow();
            $highestColumn = Coordinate::columnIndexFromString($sheet->getHighestDataColumn());
            if ($highestRow > $maxRows + 1 || $highestColumn > $maxColumns || max(0, $highestRow - 1) * max(1, $highestColumn) > $maxCells) {
                $spreadsheet->disconnectWorksheets();
                throw new \RuntimeException('source_cell_limit');
            }
            $matrix = $sheet->toArray(null, true, false, false);
            $spreadsheet->disconnectWorksheets();
            if (count($matrix) < 2) {
                throw new \RuntimeException('source_empty');
            }
            $headers = array_map(fn ($value, $index) => trim((string) ($value ?? '')) ?: 'kolom_'.$index, $matrix[0], array_keys($matrix[0]));
            if (count($headers) !== count(array_unique($headers))) {
                throw new \RuntimeException('duplicate_headers');
            }
            $rows = [];
            foreach (array_slice($matrix, 1) as $row) {
                if (count(array_filter($row, fn ($value) => $value !== null && $value !== '')) === 0) {
                    continue;
                }
                $normalized = array_slice(array_pad($row, count($headers), null), 0, count($headers));
                $rows[] = array_combine($headers, $normalized);
            }

            return [$rows, $headers, null];
        }
        if ($format === 'json' || $format === 'geojson') {
            $raw = file_get_contents($path);
            if ($raw === false || ! mb_check_encoding($raw, 'UTF-8')) {
                throw new \RuntimeException('source_encoding_invalid');
            }
            $this->assertJsonComplexityBounds($raw);
            try {
                $decoded = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                throw new \RuntimeException('source_json_invalid');
            }
            if ($format === 'geojson') {
                if (! is_array($decoded) || ! in_array($decoded['type'] ?? '', ['FeatureCollection', 'Feature', 'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'], true)) {
                    throw new \RuntimeException('geojson_type_invalid');
                }
                $features = ($decoded['type'] ?? '') === 'FeatureCollection' ? ($decoded['features'] ?? []) : (($decoded['type'] ?? '') === 'Feature' ? [$decoded] : [['type' => 'Feature', 'properties' => [], 'geometry' => $decoded]]);
                if (! is_array($features)) {
                    throw new \RuntimeException('geojson_geometry_invalid');
                }
                $rows = [];
                foreach ($features as $index => $feature) {
                    if (! is_array($feature) || ! is_array($feature['geometry'] ?? null)) {
                        throw new \RuntimeException('geojson_geometry_invalid');
                    }
                    $props = is_array($feature['properties'] ?? null) ? $feature['properties'] : [];
                    $props['_geometry_type'] = $feature['geometry']['type'] ?? 'Unknown';
                    $props['_feature_index'] = $index + 1;
                    $rows[] = $props;
                }
                $headers = $this->headersFor($rows);

                return [$rows, $headers, $decoded];
            }
            if (! is_array($decoded) || ! array_is_list($decoded)) {
                throw new \RuntimeException('json_must_be_array');
            }
            $rows = [];
            $maxRows = (int) config('satu_data.conversion.max_rows', 100000);
            $maxColumns = (int) config('satu_data.conversion.max_columns', 100);
            $maxCells = (int) config('satu_data.conversion.max_cells', 200000);
            foreach ($decoded as $row) {
                if (! is_array($row) || array_is_list($row)) {
                    throw new \RuntimeException('tabular_shape_invalid');
                }
                if (count($rows) >= $maxRows) {
                    throw new \RuntimeException('source_row_limit');
                }
                if (count($row) > $maxColumns) {
                    throw new \RuntimeException('source_column_limit');
                }
                if ((count($rows) + 1) * max(1, count($row)) > $maxCells) {
                    throw new \RuntimeException('source_cell_limit');
                }
                $rows[] = $this->flattenValues($row);
            }

            return [$rows, $this->headersFor($rows), null];
        }
        throw new \RuntimeException('source_format_not_supported');
    }

    private function assertXlsxArchiveBounds(string $path): void
    {
        if (! class_exists(\ZipArchive::class)) {
            throw new \RuntimeException('xlsx_support_unavailable');
        }
        $zip = new \ZipArchive;
        if ($zip->open($path) !== true) {
            throw new \RuntimeException('xlsx_archive_invalid');
        }
        try {
            if ($zip->numFiles < 1 || $zip->numFiles > 3000) {
                throw new \RuntimeException('xlsx_archive_entry_limit');
            }
            $totalExpanded = 0;
            for ($index = 0; $index < $zip->numFiles; $index++) {
                $stat = $zip->statIndex($index);
                if (! is_array($stat)) {
                    throw new \RuntimeException('xlsx_archive_invalid');
                }
                $expanded = max(0, (int) ($stat['size'] ?? 0));
                $compressed = max(0, (int) ($stat['comp_size'] ?? 0));
                $totalExpanded += $expanded;
                if ($totalExpanded > 80 * 1024 * 1024) {
                    throw new \RuntimeException('xlsx_expanded_size_limit');
                }
                if ($expanded > 1024 * 1024 && ($compressed === 0 || $expanded / $compressed > 100)) {
                    throw new \RuntimeException('xlsx_compression_ratio_limit');
                }
            }
        } finally {
            $zip->close();
        }
    }

    private function assertJsonComplexityBounds(string $json): void
    {
        $inString = false;
        $escaped = false;
        $depth = 0;
        $tokens = 0;
        $stringBytes = 0;
        $maxTokens = (int) config('satu_data.conversion.max_json_tokens', 600000);
        $maxStringBytes = 2 * 1024 * 1024;
        $length = strlen($json);
        for ($index = 0; $index < $length; $index++) {
            $char = $json[$index];
            if ($inString) {
                if ($escaped) {
                    $escaped = false;

                    continue;
                }
                if ($char === '\\') {
                    $escaped = true;

                    continue;
                }
                if ($char === '"') {
                    $inString = false;
                    $stringBytes = 0;

                    continue;
                }
                if (++$stringBytes > $maxStringBytes) {
                    throw new \RuntimeException('json_string_limit');
                }

                continue;
            }
            if ($char === '"') {
                $inString = true;
                $stringBytes = 0;
                $tokens++;
            } elseif ($char === '{' || $char === '[') {
                $depth++;
                $tokens++;
                if ($depth > 64) {
                    throw new \RuntimeException('source_json_complexity_limit');
                }
            } elseif ($char === '}' || $char === ']') {
                $depth--;
                $tokens++;
                if ($depth < 0) {
                    throw new \RuntimeException('source_json_complexity_limit');
                }
            } elseif ($char === ',' || $char === ':') {
                $tokens++;
            }
            if ($tokens > $maxTokens) {
                throw new \RuntimeException('source_json_complexity_limit');
            }
        }
        if ($inString || $depth !== 0) {
            throw new \RuntimeException('source_json_complexity_limit');
        }
    }

    private function headersFor(array $rows): array
    {
        $headers = [];
        foreach (array_slice($rows, 0, 1000) as $row) {
            foreach (array_keys($row) as $key) {
                $headers[(string) $key] = true;
            }
        }

        return array_keys($headers);
    }

    private function flattenValues(array $row): array
    {
        foreach ($row as $key => $value) {
            if (is_array($value) || is_object($value)) {
                $row[$key] = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
            }
        }

        return $row;
    }

    private function assertTabularShape(array $rows, array $headers): void
    {
        if ($headers === []) {
            throw new \RuntimeException('source_empty');
        }
        if (count($headers) > 500) {
            throw new \RuntimeException('source_column_limit');
        }
        foreach ($rows as $row) {
            if (! is_array($row)) {
                throw new \RuntimeException('tabular_shape_invalid');
            }
            foreach (array_keys($row) as $key) {
                if (! in_array($key, $headers, true)) {
                    throw new \RuntimeException('tabular_shape_invalid');
                }
            }
        }
    }

    private function buildOutputs(array $rows, array $headers, ?array $geojson, DatasetResource $source): array
    {
        // Check each generated artifact immediately to avoid building every format
        // after a large CSV/JSON output already exceeded the configured storage limit.
        $outputs = [];
        $maxBytes = max(1024, (int) config('satu_data.conversion.max_output_bytes', 26214400));
        $csvBytes = $this->toCsv($headers, $rows);
        $this->assertOutputSize('csv', $csvBytes, $maxBytes);
        $outputs['csv'] = ['bytes' => $csvBytes, 'filename' => 'data.csv', 'mime' => 'text/csv; charset=UTF-8'];

        $jsonBytes = json_encode(array_map(fn ($row) => (object) $row, $rows), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);
        $this->assertOutputSize('json', $jsonBytes, $maxBytes);
        $outputs['json'] = ['bytes' => $jsonBytes, 'filename' => 'data.json', 'mime' => 'application/json'];

        $xlsxBytes = $this->toXlsx($headers, $rows);
        $this->assertOutputSize('xlsx', $xlsxBytes, $maxBytes);
        $outputs['xlsx'] = ['bytes' => $xlsxBytes, 'filename' => 'data.xlsx', 'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

        $pdfBytes = $this->toPdf($headers, $rows);
        $this->assertOutputSize('pdf', $pdfBytes, $maxBytes);
        $outputs['pdf'] = ['bytes' => $pdfBytes, 'filename' => 'data.pdf', 'mime' => 'application/pdf'];
        if ($geojson !== null) {
            $geojsonBytes = json_encode($geojson, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            $this->assertOutputSize('geojson', $geojsonBytes, $maxBytes);
            $outputs['geojson'] = ['bytes' => $geojsonBytes, 'filename' => $source->original_filename ?: 'data.geojson', 'mime' => 'application/geo+json'];
        }

        return $outputs;
    }

    private function assertOutputSize(string $format, string $bytes, int $maxBytes): void
    {
        if (strlen($bytes) > $maxBytes) {
            throw new \RuntimeException('output_size_limit_'.$format);
        }
    }

    private function toCsv(array $headers, array $rows): string
    {
        $stream = fopen('php://temp', 'r+');
        fputcsv($stream, array_map(fn ($value) => $this->spreadsheetSafeString((string) $value), $headers), ',', '"', '\\');
        foreach ($rows as $row) {
            $values = [];
            foreach ($headers as $header) {
                $values[] = $this->spreadsheetSafeCsvValue($row[$header] ?? '');
            }
            fputcsv($stream, $values, ',', '"', '\\');
        }
        rewind($stream);
        $value = stream_get_contents($stream);
        fclose($stream);

        return "\xEF\xBB\xBF".($value === false ? '' : $value);
    }

    private function toXlsx(array $headers, array $rows): string
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        foreach ($headers as $column => $header) {
            $cell = Coordinate::stringFromColumnIndex($column + 1).'1';
            $sheet->getCell($cell)->setValueExplicit($this->spreadsheetSafeString((string) $header), DataType::TYPE_STRING);
        }
        $line = 2;
        foreach ($rows as $row) {
            foreach ($headers as $column => $header) {
                $value = $row[$header] ?? null;
                $cell = $sheet->getCell(Coordinate::stringFromColumnIndex($column + 1).$line);
                if (is_int($value) || is_float($value)) {
                    $cell->setValueExplicit($value, DataType::TYPE_NUMERIC);
                } elseif (is_bool($value)) {
                    $cell->setValueExplicit($value, DataType::TYPE_BOOL);
                } else {
                    if (is_array($value) || is_object($value)) {
                        $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
                    }
                    $cell->setValueExplicit($this->spreadsheetSafeString((string) ($value ?? '')), DataType::TYPE_STRING);
                }
            }
            $line++;
        }
        $writer = new Xlsx($spreadsheet);
        ob_start();
        $writer->save('php://output');
        $bytes = (string) ob_get_clean();
        $spreadsheet->disconnectWorksheets();

        return $bytes;
    }

    private function spreadsheetSafeCsvValue(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }
        $formulaLike = preg_match('/^[\x00-\x20]*[=+@]/', $value) === 1
            || preg_match('/^[\x00-\x20]*-(?![0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$)/', $value) === 1;

        return $formulaLike ? "'".$value : $value;
    }

    private function spreadsheetSafeString(string $value): string
    {
        return (string) $this->spreadsheetSafeCsvValue($value);
    }

    private function toPdf(array $headers, array $rows): string
    {
        $html = '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:DejaVu Sans,sans-serif;font-size:8px}h1{font-size:14px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #aab4be;padding:4px;text-align:left;word-wrap:break-word}th{background:#e8eef3}tr:nth-child(even){background:#f7f9fb}</style></head><body><h1>Pratinjau data</h1><p>'.count($rows).' baris · '.count($headers).' kolom</p><table><thead><tr>';
        foreach (array_slice($headers, 0, 12) as $header) {
            $html .= '<th>'.e($header).'</th>';
        }
        $html .= '</tr></thead><tbody>';
        foreach (array_slice($rows, 0, 500) as $row) {
            $html .= '<tr>';
            foreach (array_slice($headers, 0, 12) as $header) {
                $html .= '<td>'.e(is_scalar($row[$header] ?? null) ? (string) ($row[$header] ?? '') : json_encode($row[$header] ?? null)).'</td>';
            }
            $html .= '</tr>';
        }
        $html .= '</tbody></table><p>PDF dibatasi hingga 500 baris dan 12 kolom. Gunakan CSV/XLSX untuk data lengkap.</p></body></html>';
        $pdf = new Dompdf(['isRemoteEnabled' => false, 'isPhpEnabled' => false]);
        $pdf->loadHtml($html, 'UTF-8');
        $pdf->setPaper('A4', 'landscape');
        $pdf->render();

        return $pdf->output();
    }

    private function storePreviewRows(string $resourceId, array $rows, array $headers): void
    {
        DB::table('dataset_resource_rows')->where('resource_id', $resourceId)->delete();
        $limit = min(count($rows), 100000);
        for ($offset = 0; $offset < $limit; $offset += 500) {
            $batch = [];
            foreach (array_slice($rows, $offset, 500) as $index => $row) {
                $data = [];
                foreach ($headers as $header) {
                    $data[$header] = $row[$header] ?? null;
                }
                $batch[] = ['resource_id' => $resourceId, 'row_number' => $offset + $index + 1, 'row_data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_THROW_ON_ERROR)];
            }
            if ($batch) {
                DB::table('dataset_resource_rows')->insert($batch);
            }
        }
    }
}
