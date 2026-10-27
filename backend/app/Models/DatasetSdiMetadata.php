<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DatasetSdiMetadata extends Model
{
    protected $table = 'dataset_sdi_metadata';

    protected $primaryKey = null;

    public $incrementing = false;

    protected $fillable = ['dataset_id', 'dataset_version', 'ddp_id', 'ddp_name', 'source_reference', 'available_year', 'sds_code', 'sds_type', 'sds_version', 'standard_concept', 'standard_definition', 'measurement', 'presentation_classification', 'reference_code', 'reference_code_version', 'method_description', 'sds_registry_id', 'reference_system_id'];

    protected function casts(): array
    {
        return ['presentation_classification' => 'array', 'available_year' => 'integer', 'dataset_version' => 'integer'];
    }

    public function standardRegistry()
    {
        return $this->belongsTo(SdiStandard::class, 'sds_registry_id');
    }

    public function referenceSystem()
    {
        return $this->belongsTo(ReferenceCodeSystem::class, 'reference_system_id');
    }
}
