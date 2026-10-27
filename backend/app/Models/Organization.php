<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    use HasUuids;

    protected $fillable = ['code', 'slug', 'name', 'short_name', 'description', 'official_email', 'official_url', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function memberships()
    {
        return $this->hasMany(OrganizationMembership::class);
    }

    public function datasets()
    {
        return $this->hasMany(Dataset::class);
    }
}
