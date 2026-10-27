<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DatasetResource extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = ['dataset_id', 'dataset_version', 'storage_path', 'original_filename', 'format', 'mime_type', 'size_bytes', 'checksum_sha256', 'is_source', 'is_public', 'conversion_status', 'converter_version', 'created_by', 'row_count', 'column_schema', 'preview_enabled', 'created_at'];

    protected function casts(): array
    {
        return ['is_source' => 'boolean', 'is_public' => 'boolean', 'preview_enabled' => 'boolean', 'column_schema' => 'array', 'size_bytes' => 'integer', 'row_count' => 'integer', 'created_at' => 'datetime'];
    }

    public function dataset()
    {
        return $this->belongsTo(Dataset::class);
    }

    public function rows()
    {
        return $this->hasMany(DatasetResourceRow::class, 'resource_id');
    }
}
