<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use LogicException;

class OrganizationMembership extends Model
{
    use HasUuids;

    protected $fillable = ['user_id', 'organization_id', 'role', 'is_active', 'created_by'];

    protected $hidden = ['scope_key'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::saving(function (self $membership): void {
            $globalRole = in_array($membership->role, ['super_admin', 'data_admin', 'auditor'], true);
            if ($globalRole !== ($membership->organization_id === null)) {
                throw new LogicException('Global roles require a null organization; organization roles require an organization.');
            }
            $membership->scope_key = $membership->organization_id ?: '__global__';
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function roleDefinition()
    {
        return $this->belongsTo(Role::class, 'role', 'code');
    }
}
