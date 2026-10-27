<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SdiStandard extends Model
{
    use HasUuids;

    protected $table = 'sdi_standard_registry';

    protected $fillable = ['standard_code', 'standard_type', 'title', 'definition', 'authority_name', 'version_label', 'source_url', 'evidence_url', 'valid_from', 'valid_until', 'status', 'created_by', 'reviewed_by'];
}
