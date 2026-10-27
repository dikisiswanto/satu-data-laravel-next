<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DatasetResourceRow extends Model
{
    protected $table = 'dataset_resource_rows';

    protected $primaryKey = null;

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = ['resource_id', 'row_number', 'row_data'];

    protected function casts(): array
    {
        return ['row_data' => 'array', 'row_number' => 'integer'];
    }
}
