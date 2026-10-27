<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ReferenceCodeSystem extends Model
{
    use HasUuids;

    protected $fillable = ['system_code', 'title', 'description', 'authority_name', 'version_label', 'source_url', 'evidence_url', 'valid_from', 'valid_until', 'status', 'created_by', 'reviewed_by'];

    protected function casts(): array
    {
        return ['valid_from' => 'date:Y-m-d', 'valid_until' => 'date:Y-m-d'];
    }

    public function entries()
    {
        return $this->hasMany(ReferenceCodeEntry::class, 'system_id');
    }
}
