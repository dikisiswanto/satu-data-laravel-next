<?php

namespace App\Services;

/**
 * Membatasi proyeksi pratinjau tabel tanpa membatasi berkas unduhan aslinya.
 * Batas byte dibuat konservatif agar satu baris atau satu batch tidak terlalu
 * besar untuk disimpan sebagai JSON pada MariaDB.
 */
class DatasetPreviewBudget
{
    public const MAX_PROJECTION_BYTES = 33554432; // 32 MiB

    public const MAX_ROW_BYTES = 786432; // 768 KiB

    public const MAX_BATCH_BYTES = 4194304; // 4 MiB

    public const MAX_BATCH_ROWS = 500;

    private const ROW_ENVELOPE_BYTES = 96;

    /**
     * @return array{available: bool, reason: string|null, row_bytes: array<int, int>, total_bytes: int}
     */
    public function inspect(array $rows, array $headers, int $limit = 100000): array
    {
        if ($rows === [] || $limit < 1) {
            return ['available' => false, 'reason' => 'empty', 'row_bytes' => [], 'total_bytes' => 0];
        }

        $rowBytes = [];
        $totalBytes = 2;
        foreach ($rows as $row) {
            if (count($rowBytes) >= $limit) {
                break;
            }

            $data = [];
            foreach ($headers as $header) {
                $data[$header] = $row[$header] ?? null;
            }

            try {
                $serialized = json_encode(
                    $data,
                    JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_THROW_ON_ERROR,
                );
            } catch (\JsonException) {
                return [
                    'available' => false,
                    'reason' => 'row_not_serializable',
                    'row_bytes' => [],
                    'total_bytes' => $totalBytes,
                ];
            }

            $bytes = strlen($serialized) + self::ROW_ENVELOPE_BYTES;
            if ($bytes > self::MAX_ROW_BYTES) {
                return [
                    'available' => false,
                    'reason' => 'row_too_large',
                    'row_bytes' => [],
                    'total_bytes' => $totalBytes + $bytes,
                ];
            }

            $totalBytes += $bytes;
            if ($totalBytes > self::MAX_PROJECTION_BYTES) {
                return [
                    'available' => false,
                    'reason' => 'projection_too_large',
                    'row_bytes' => [],
                    'total_bytes' => $totalBytes,
                ];
            }

            $rowBytes[] = $bytes;
        }

        return ['available' => $rowBytes !== [], 'reason' => $rowBytes === [] ? 'empty' : null, 'row_bytes' => $rowBytes, 'total_bytes' => $totalBytes];
    }

    public function shouldFlushBatch(int $batchRows, int $batchBytes, int $nextRowBytes): bool
    {
        return $batchRows > 0 && (
            $batchRows >= self::MAX_BATCH_ROWS
            || $batchBytes + $nextRowBytes > self::MAX_BATCH_BYTES
        );
    }
}
