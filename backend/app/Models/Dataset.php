<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Dataset extends Model
{
    use HasUuids;

    protected $fillable = [
        'code', 'slug', 'title', 'description', 'organization_id', 'category', 'keywords',
        'reference_period_start', 'reference_period_end', 'geographic_scope', 'update_frequency',
        'source_name', 'source_url', 'methodology', 'unit', 'license_text', 'contact',
        'last_data_updated_at', 'publication_check', 'metadata_schema_version', 'status',
        'created_by', 'updated_by', 'submitted_at', 'reviewed_by', 'reviewed_at', 'published_at',
        'archived_at', 'current_version', 'draft_version',
    ];

    protected function casts(): array
    {
        return ['keywords' => 'array', 'publication_check' => 'array', 'reference_period_start' => 'date:Y-m-d', 'reference_period_end' => 'date:Y-m-d', 'last_data_updated_at' => 'datetime', 'submitted_at' => 'datetime', 'reviewed_at' => 'datetime', 'published_at' => 'datetime', 'archived_at' => 'datetime', 'current_version' => 'integer', 'draft_version' => 'integer'];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function resources()
    {
        return $this->hasMany(DatasetResource::class);
    }

    public function versions()
    {
        return $this->hasMany(DatasetVersion::class);
    }

    public function sdiMetadata()
    {
        return $this->hasMany(DatasetSdiMetadata::class);
    }
}
