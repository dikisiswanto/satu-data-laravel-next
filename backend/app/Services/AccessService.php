<?php

namespace App\Services;

use App\Models\OrganizationMembership;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class AccessService
{
    public const GLOBAL_ROLES = ['super_admin', 'data_admin', 'auditor'];

    public const EDIT_ROLES = ['super_admin', 'data_admin', 'admin_opd', 'editor'];

    public const REVIEW_ROLES = ['super_admin', 'data_admin', 'admin_opd', 'reviewer'];

    public const ALL_ROLES = ['super_admin', 'data_admin', 'admin_opd', 'reviewer', 'editor', 'viewer', 'auditor'];

    /**
     * Permission checks are backed by the normalized role/permission catalog.
     * Role-code helpers remain for the frontend compatibility contract, but new
     * business actions should authorize against a permission code.
     */
    /** Check a permission granted by an explicitly global membership only. */
    public function hasPermission(User $user, string $permissionCode): bool
    {
        if (! $user->is_active) {
            return false;
        }

        return OrganizationMembership::query()
            ->where('user_id', $user->id)
            ->whereNull('organization_id')
            ->whereIn('role', self::GLOBAL_ROLES)
            ->where('is_active', true)
            ->whereHas('roleDefinition.permissions', fn ($query) => $query->where('permissions.code', $permissionCode))
            ->exists();
    }

    /**
     * Check a permission within an organization. A global membership can grant
     * the permission across organizations, but a local membership must point
     * to the exact requested active organization. This prevents an unrelated
     * organization membership from satisfying a scope check.
     */
    public function hasPermissionInOrganization(User $user, string $organizationId, string $permissionCode): bool
    {
        if (! $user->is_active) {
            return false;
        }

        return OrganizationMembership::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->whereHas('roleDefinition.permissions', fn ($query) => $query->where('permissions.code', $permissionCode))
            ->where(function ($query) use ($organizationId): void {
                $query->where(function ($global): void {
                    $global->whereNull('organization_id')->whereIn('role', self::GLOBAL_ROLES);
                })->orWhere(function ($local) use ($organizationId): void {
                    $local->where('organization_id', $organizationId)
                        ->whereHas('organization', fn ($organization) => $organization->where('is_active', true));
                });
            })
            ->exists();
    }

    /**
     * Return organizations where the user holds a permission. `null` means the
     * permission is granted by an explicit global membership; an empty array
     * means no access. This avoids the ambiguous empty-array global sentinel in
     * new query scopes while keeping the older role-code helper for compatibility.
     *
     * @return array<int, string>|null
     */
    public function organizationIdsWithPermission(User $user, string $permissionCode): ?array
    {
        if (! $user->is_active) {
            return [];
        }
        if ($this->hasPermission($user, $permissionCode)) {
            return null;
        }

        return OrganizationMembership::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->whereNotNull('organization_id')
            ->whereHas('organization', fn ($organization) => $organization->where('is_active', true))
            ->whereHas('roleDefinition.permissions', fn ($query) => $query->where('permissions.code', $permissionCode))
            ->pluck('organization_id')
            ->unique()
            ->values()
            ->all();
    }

    public function hasAnyPermissionInOrganization(User $user, string $organizationId, array $permissionCodes): bool
    {
        foreach (array_values(array_unique($permissionCodes)) as $permissionCode) {
            if (is_string($permissionCode) && $permissionCode !== ''
                && $this->hasPermissionInOrganization($user, $organizationId, $permissionCode)) {
                return true;
            }
        }

        return false;
    }

    public function requirePermission(User $user, string $permissionCode): void
    {
        if (! $this->hasPermission($user, $permissionCode)) {
            throw new AuthorizationException('forbidden');
        }
    }

    public function requirePermissionInOrganization(User $user, string $organizationId, string $permissionCode): void
    {
        if (! $this->hasPermissionInOrganization($user, $organizationId, $permissionCode)) {
            throw new AuthorizationException('forbidden');
        }
    }

    public function requireAnyPermissionInOrganization(User $user, string $organizationId, array $permissionCodes): void
    {
        if (! $this->hasAnyPermissionInOrganization($user, $organizationId, $permissionCodes)) {
            throw new AuthorizationException('forbidden');
        }
    }

    public function memberships(User $user): array
    {
        return OrganizationMembership::query()->with('organization:id,name,slug,code,is_active,official_email,official_url,created_at,updated_at')
            ->where('user_id', $user->id)->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('organization_id')->orWhereHas('organization', fn ($org) => $org->where('is_active', true)))
            ->get()
            ->map(fn ($membership) => [
                'id' => $membership->id,
                'user_id' => $membership->user_id,
                'organization_id' => $membership->organization_id,
                'role' => $membership->role,
                'is_active' => (bool) $membership->is_active,
                'organizations' => $membership->organization ? ['id' => $membership->organization->id, 'name' => $membership->organization->name, 'slug' => $membership->organization->slug, 'code' => $membership->organization->code, 'is_active' => (bool) $membership->organization->is_active, 'official_email' => $membership->organization->official_email, 'official_url' => $membership->organization->official_url, 'created_at' => $membership->organization->created_at, 'updated_at' => $membership->organization->updated_at] : null,
            ])->all();
    }

    public function roles(User $user): array
    {
        return array_values(array_unique(array_column($this->memberships($user), 'role')));
    }

    public function hasAnyRole(User $user, array $roles): bool
    {
        if (! $user->is_active || $roles === []) {
            return false;
        }
        $globalRoles = array_values(array_intersect(self::GLOBAL_ROLES, $roles));
        if ($globalRoles !== [] && OrganizationMembership::query()->where('user_id', $user->id)->whereNull('organization_id')->where('is_active', true)->whereIn('role', $globalRoles)->exists()) {
            return true;
        }
        $organizationRoles = array_values(array_diff($roles, self::GLOBAL_ROLES));

        return $organizationRoles !== [] && OrganizationMembership::query()->where('user_id', $user->id)->whereNotNull('organization_id')->where('is_active', true)->whereIn('role', $organizationRoles)->whereHas('organization', fn ($q) => $q->where('is_active', true))->exists();
    }

    public function requireAnyRole(User $user, array $roles): void
    {
        if (! $user->is_active || ! $this->hasAnyRole($user, $roles)) {
            throw new AuthorizationException('forbidden');
        }
    }

    public function canAccessOrganization(User $user, string $organizationId, array $roles = self::ALL_ROLES): bool
    {
        if (! $user->is_active) {
            return false;
        }
        // A global membership bypasses organization scoping only when that
        // global role is explicitly allowed by the calling operation. In
        // particular, the global read-only auditor role must not inherit edit
        // privileges merely because it can see every organization.
        $allowedGlobalRoles = array_values(array_intersect(self::GLOBAL_ROLES, $roles));
        $allowedOrganizationRoles = array_values(array_diff($roles, self::GLOBAL_ROLES));

        return ($allowedGlobalRoles !== [] && $this->hasAnyRole($user, $allowedGlobalRoles))
            || ($allowedOrganizationRoles !== [] && OrganizationMembership::query()->where('user_id', $user->id)->where('organization_id', $organizationId)->where('is_active', true)->whereIn('role', $allowedOrganizationRoles)->whereHas('organization', fn ($q) => $q->where('is_active', true))->exists());
    }

    public function requireOrganization(User $user, string $organizationId, array $roles = self::ALL_ROLES): void
    {
        if (! $this->canAccessOrganization($user, $organizationId, $roles)) {
            throw new AuthorizationException('forbidden');
        }
    }

    public function accessibleOrganizationIds(User $user, array $roles = self::ALL_ROLES): array
    {
        if (! $user->is_active) {
            return [];
        }

        // An empty list is the established contract for "all organizations".
        // Only honor that sentinel when the caller explicitly allows a global
        // role. Otherwise a global auditor/admin membership must not widen a
        // narrower query (for example, one limited to editors).
        $allowedGlobalRoles = array_values(array_intersect(self::GLOBAL_ROLES, $roles));
        if ($allowedGlobalRoles !== [] && $this->hasAnyRole($user, $allowedGlobalRoles)) {
            return [];
        }

        $organizationRoles = array_values(array_diff($roles, self::GLOBAL_ROLES));
        if ($organizationRoles === []) {
            return [];
        }

        return OrganizationMembership::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->whereIn('role', $organizationRoles)
            ->whereNotNull('organization_id')
            ->whereHas('organization', fn ($query) => $query->where('is_active', true))
            ->pluck('organization_id')
            ->unique()
            ->values()
            ->all();
    }
}
