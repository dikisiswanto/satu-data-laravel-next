<?php

namespace Tests\Unit;

use App\Services\DatasetPreviewBudget;
use PHPUnit\Framework\TestCase;

class DatasetPreviewBudgetTest extends TestCase
{
    public function test_accepts_small_rows_and_returns_byte_estimates(): void
    {
        $result = (new DatasetPreviewBudget)->inspect([
            ['nama' => 'Wajo', 'jumlah' => 12],
            ['nama' => 'Sengkang', 'jumlah' => 8],
        ], ['nama', 'jumlah']);

        $this->assertTrue($result['available']);
        $this->assertNull($result['reason']);
        $this->assertCount(2, $result['row_bytes']);
        $this->assertGreaterThan(2, $result['total_bytes']);
    }

    public function test_disables_preview_when_a_single_row_exceeds_the_row_budget(): void
    {
        $result = (new DatasetPreviewBudget)->inspect([
            ['keterangan' => str_repeat('x', DatasetPreviewBudget::MAX_ROW_BYTES)],
        ], ['keterangan']);

        $this->assertFalse($result['available']);
        $this->assertSame('row_too_large', $result['reason']);
        $this->assertSame([], $result['row_bytes']);
    }

    public function test_disables_preview_when_total_projection_exceeds_the_budget(): void
    {
        $rows = array_fill(0, 50, ['keterangan' => str_repeat('x', 680000)]);
        $result = (new DatasetPreviewBudget)->inspect($rows, ['keterangan']);

        $this->assertFalse($result['available']);
        $this->assertSame('projection_too_large', $result['reason']);
        $this->assertSame([], $result['row_bytes']);
    }

    public function test_flushes_a_batch_before_its_row_or_byte_limit_is_exceeded(): void
    {
        $budget = new DatasetPreviewBudget;

        $this->assertFalse($budget->shouldFlushBatch(1, 100, 200));
        $this->assertTrue($budget->shouldFlushBatch(1, DatasetPreviewBudget::MAX_BATCH_BYTES - 100, 200));
        $this->assertTrue($budget->shouldFlushBatch(DatasetPreviewBudget::MAX_BATCH_ROWS, 100, 100));
    }

    public function test_limits_inspection_to_the_number_of_rows_that_will_be_stored(): void
    {
        $result = (new DatasetPreviewBudget)->inspect([
            ['nama' => 'Baris 1'],
            ['nama' => 'Baris 2'],
        ], ['nama'], 1);

        $this->assertTrue($result['available']);
        $this->assertCount(1, $result['row_bytes']);
    }
}
