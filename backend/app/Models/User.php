<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $fillable = ['email', 'password', 'display_name', 'is_active', 'email_verified_at', 'onboarding_completed_at'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['email_verified_at' => 'datetime', 'onboarding_completed_at' => 'datetime', 'password' => 'hashed', 'is_active' => 'boolean'];
    }

    public function setEmailAttribute(string $value): void
    {
        $this->attributes['email'] = mb_strtolower(trim($value));
    }

    public function profile()
    {
        return $this->hasOne(Profile::class);
    }

    public function memberships()
    {
        return $this->hasMany(OrganizationMembership::class);
    }
}
