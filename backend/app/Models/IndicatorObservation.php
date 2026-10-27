<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class IndicatorObservation extends Model
{
    use HasUuids;

    protected $fillable = ['indicator_id', 'period_start', 'period_end', 'period_label', 'value_numeric', 'value_text', 'unit', 'geographic_code', 'geographic_name', 'dimension_key', 'dimensions', 'source_reference', 'source_name', 'source_url', 'revision_no', 'is_current', 'status', 'quality_status', 'created_by', 'published_by', 'published_at'];

    protected function casts(): array
    {
        return ['period_start' => 'date:Y-m-d', 'period_end' => 'date:Y-m-d', 'value_numeric' => 'decimal:8', 'dimensions' => 'array', 'is_current' => 'boolean', 'published_at' => 'datetime'];
    }

    public function indicator()
    {
        return $this->belongsTo(Indicator::class);
    }
}
