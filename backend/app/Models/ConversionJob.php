<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ConversionJob extends Model
{
    use HasUuids;

    protected $fillable = ['dataset_id', 'dataset_version', 'source_resource_id', 'target_format', 'status', 'attempts', 'idempotency_key', 'requested_by', 'started_at', 'finished_at', 'error_code', 'safe_error_message', 'worker_id', 'lease_expires_at', 'max_attempts'];

    protected function casts(): array
    {
        return ['dataset_version' => 'integer', 'attempts' => 'integer', 'max_attempts' => 'integer', 'started_at' => 'datetime', 'finished_at' => 'datetime', 'lease_expires_at' => 'datetime'];
    }
}
