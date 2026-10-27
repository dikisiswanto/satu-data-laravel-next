<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Indicator extends Model
{
    use HasUuids;

    protected $fillable = ['code', 'slug', 'title', 'definition', 'unit', 'organization_id', 'source_name', 'period_label', 'value_numeric', 'value_text', 'reference_period_start', 'reference_period_end', 'status', 'created_by', 'updated_by', 'published_at'];

    protected function casts(): array
    {
        return ['value_numeric' => 'decimal:8', 'reference_period_start' => 'date:Y-m-d', 'reference_period_end' => 'date:Y-m-d', 'published_at' => 'datetime'];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function observations()
    {
        return $this->hasMany(IndicatorObservation::class);
    }
}
