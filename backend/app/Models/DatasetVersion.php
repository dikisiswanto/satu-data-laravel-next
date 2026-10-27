<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DatasetVersion extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = ['dataset_id', 'version', 'metadata_snapshot', 'source_resource_id', 'created_by', 'created_at', 'change_summary', 'version_status'];

    protected function casts(): array
    {
        return ['metadata_snapshot' => 'array', 'version' => 'integer', 'created_at' => 'datetime'];
    }
}
