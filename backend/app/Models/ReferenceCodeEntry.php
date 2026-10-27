<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ReferenceCodeEntry extends Model
{
    use HasUuids;

    protected $fillable = ['system_id', 'code', 'label', 'definition', 'parent_code', 'source_reference', 'valid_from', 'valid_until', 'created_by'];

    protected function casts(): array
    {
        return ['valid_from' => 'date:Y-m-d', 'valid_until' => 'date:Y-m-d'];
    }

    public function system()
    {
        return $this->belongsTo(ReferenceCodeSystem::class, 'system_id');
    }
}
