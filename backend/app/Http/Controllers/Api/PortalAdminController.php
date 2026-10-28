<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Profile;
use App\Models\User;
use App\Rules\MaxPasswordBytes;
use App\Services\AccessService;
use App\Services\AuditService;
use App\Services\PublicCatalogRevisionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PortalAdminController extends Controller
{
    public function __construct(private readonly AccessService $access, private readonly AuditService $audit, private readonly PublicCatalogRevisionService $catalogRevision) {}

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = Profile::query()->firstOrCreate(['user_id' => $user->id], ['display_name' => $user->display_name ?: Str::before($user->email, '@'), 'is_active' => true]);
        $roles = $this->access->roles($user);
        $memberships = $this->access->memberships($user);
        $query = DB::table('datasets');
        $organizationIds = $this->access->organizationIdsWithPermission($user, 'datasets.read');
        if ($organizationIds !== null) {
            if ($organizationIds === []) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('organization_id', $organizationIds);
            }
        }
        $counts = (clone $query)->selectRaw("count(*) as total, COALESCE(SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END), 0) as review, COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) as draft")->first();
        $recent = (clone $query)->leftJoin('organizations', 'organizations.id', '=', 'datasets.organization_id')->orderByDesc('datasets.updated_at')->limit(8)->get(['datasets.id', 'datasets.code', 'datasets.slug', 'datasets.title', 'datasets.status', 'datasets.updated_at', 'datasets.organization_id', 'organizations.name as organization_name'])->map(fn ($row) => (array) $row)->all();

        return response()->json(['data' => ['user' => ['id' => $user->id, 'email' => $user->email], 'profile' => $profile, 'memberships' => $memberships, 'shell' => ['roles' => $roles, 'onboarding_completed_at' => $profile->onboarding_completed_at?->toISOString()], 'summary' => ['total' => (int) ($counts->total ?? 0), 'review' => (int) ($counts->review ?? 0), 'draft' => (int) ($counts->draft ?? 0), 'recent' => $recent]]], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function shell(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = Profile::query()->firstOrCreate(['user_id' => $user->id], ['display_name' => $user->display_name ?: Str::before($user->email, '@'), 'is_active' => true]);

        return response()->json(['data' => ['roles' => $this->access->roles($user), 'onboarding_completed_at' => $profile->onboarding_completed_at?->toISOString(), 'memberships' => $this->access->memberships($user)]], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = Profile::query()->firstOrCreate(['user_id' => $user->id], ['display_name' => $user->display_name ?: Str::before($user->email, '@'), 'is_active' => true]);

        return response()->json(['data' => ['user_id' => $user->id, 'email' => $user->email, 'display_name' => $profile->display_name, 'is_active' => (bool) $profile->is_active, 'onboarding_completed_at' => $profile->onboarding_completed_at]], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate(['display_name' => ['required', 'string', 'min:2', 'max:120']]);
        $user = $request->user();
        $profile = Profile::query()->updateOrCreate(['user_id' => $user->id], ['display_name' => trim($data['display_name']), 'is_active' => true]);
        $user->forceFill(['display_name' => trim($data['display_name'])])->save();
        $this->audit->record($user->id, 'profile.update', 'profile', $user->id, null, 'success');

        return response()->json(['data' => $profile], 200, ['Cache-Control' => 'no-store']);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string', 'max:128', new MaxPasswordBytes],
            'password' => ['required', 'string', 'min:12', 'max:128', new MaxPasswordBytes, 'regex:/[a-z]/', 'regex:/[A-Z]/', 'regex:/[0-9]/', 'different:current_password'],
        ]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['Kata sandi saat ini tidak benar.']]);
        }
        $user->forceFill(['password' => $data['password']])->save();
        // Invalidate all sibling sessions. The current bearer token remains valid so the UI can report success.
        $current = $user->currentAccessToken();
        $user->tokens()->when($current && $current->getKey(), fn ($q) => $q->where('id', '<>', $current->getKey()))->delete();
        $this->audit->record($user->id, 'account.password_changed', 'user', $user->id, null, 'success');

        return response()->json(['data' => ['updated' => true, 'auditRecorded' => true]], 200, ['Cache-Control' => 'no-store']);
    }

    public function completeOnboarding(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = Profile::query()->firstOrCreate(['user_id' => $user->id], ['display_name' => $user->display_name ?: Str::before($user->email, '@'), 'is_active' => true]);
        $profile->onboarding_completed_at = now();
        $profile->save();
        $user->forceFill(['onboarding_completed_at' => $profile->onboarding_completed_at])->save();
        $this->audit->record($user->id, 'account.onboarding_completed', 'profile', $user->id);

        return response()->json(['data' => ['onboarding_completed_at' => $profile->onboarding_completed_at]], 200, ['Cache-Control' => 'no-store']);
    }

    public function organizations(Request $request): JsonResponse
    {
        $query = Organization::query()->orderBy('name');
        $organizationIds = $this->access->organizationIdsWithPermission($request->user(), 'organizations.read');
        if ($organizationIds !== null) {
            if ($organizationIds === []) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('id', $organizationIds);
            }
        }

        return response()->json(['data' => $query->limit(500)->get()], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function organization(Request $request, string $id): JsonResponse
    {
        $organization = Organization::query()->find($id);
        if (! $organization) {
            return response()->json(['error' => 'not_found'], 404);
        }
        if (! $this->access->hasPermissionInOrganization($request->user(), $id, 'organizations.read')) {
            return response()->json(['error' => 'forbidden'], 403);
        }

        return response()->json(['data' => $organization], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function saveOrganization(Request $request, ?string $id = null): JsonResponse
    {
        $this->access->requireAnyRole($request->user(), ['super_admin', 'data_admin']);
        // Validate the same canonical values that will be persisted. Otherwise a
        // trailing space or lowercase code can pass `unique` and fail at insert.
        $request->merge([
            'code' => is_string($request->input('code')) ? strtoupper(trim($request->input('code'))) : $request->input('code'),
            'slug' => is_string($request->input('slug')) ? strtolower(trim($request->input('slug'))) : $request->input('slug'),
        ]);
        $candidateId = $id ?: $request->input('id');
        $ignoreId = is_string($candidateId) && Str::isUuid($candidateId) ? $candidateId : null;
        $data = $request->validate([
            'id' => ['sometimes', 'nullable', 'uuid'],
            'code' => ['required', 'string', 'min:2', 'max:50', Rule::unique('organizations', 'code')->ignore($ignoreId)],
            'slug' => ['required', 'string', 'max:120', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('organizations', 'slug')->ignore($ignoreId)],
            'name' => ['required', 'string', 'min:2', 'max:180'],
            'short_name' => ['nullable', 'string', 'max:80'], 'description' => ['nullable', 'string', 'max:2000'],
            'official_email' => ['nullable', 'email:rfc', 'max:254'], 'official_url' => ['nullable', 'url:http,https', 'max:2048'], 'is_active' => ['sometimes', 'boolean'],
        ]);
        $recordId = $id ?: ($data['id'] ?? null);
        $organization = DB::transaction(function () use ($request, $data, $recordId): Organization {
            $organization = $recordId
                ? Organization::query()->lockForUpdate()->findOrFail($recordId)
                : new Organization;
            $organization->fill([
                'code' => strtoupper(trim($data['code'])), 'slug' => $data['slug'], 'name' => trim($data['name']),
                'short_name' => $data['short_name'] ?? null, 'description' => $data['description'] ?? null,
                'official_email' => $data['official_email'] ?? null, 'official_url' => $data['official_url'] ?? null,
                'is_active' => $data['is_active'] ?? ($organization->exists ? $organization->is_active : true),
            ])->save();
            $this->catalogRevision->bump();
            $this->audit->record($request->user()->id, $recordId ? 'organization.update' : 'organization.create', 'organization', $organization->id, $organization->id, 'success', ['code' => $organization->code]);

            return $organization->fresh();
        }, 3);

        return response()->json(['data' => $organization], $recordId ? 200 : 201, ['Cache-Control' => 'no-store']);
    }

    public function memberships(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $this->access->hasAnyRole($user, ['super_admin', 'data_admin', 'auditor'])) {
            return response()->json(['data' => $this->access->memberships($user)], 200, ['Cache-Control' => 'private, no-store']);
        }
        $rows = OrganizationMembership::query()->with(['organization:id,name,slug,code,is_active,official_email,official_url,created_at,updated_at', 'user:id,email,display_name'])->orderByDesc('created_at')->limit(500)->get()->map(function ($m) {
            return ['id' => $m->id, 'user_id' => $m->user_id, 'email' => $m->user?->email, 'display_name' => $m->user?->display_name, 'organization_id' => $m->organization_id, 'role' => $m->role, 'is_active' => (bool) $m->is_active, 'created_at' => $m->created_at, 'organizations' => $m->organization ? ['id' => $m->organization->id, 'name' => $m->organization->name, 'slug' => $m->organization->slug, 'code' => $m->organization->code, 'is_active' => (bool) $m->organization->is_active, 'official_email' => $m->organization->official_email, 'official_url' => $m->organization->official_url, 'created_at' => $m->organization->created_at, 'updated_at' => $m->organization->updated_at] : null];
        })->all();

        return response()->json(['data' => $rows], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function saveMembership(Request $request, ?string $id = null): JsonResponse
    {
        $this->access->requireAnyRole($request->user(), ['super_admin']);
        $data = $request->validate([
            'id' => ['sometimes', 'nullable', 'uuid'], 'user_id' => ['required', 'uuid', 'exists:users,id'],
            'organization_id' => ['present', 'nullable', 'uuid', 'exists:organizations,id'],
            'role' => ['required', 'in:super_admin,data_admin,admin_opd,reviewer,editor,viewer,auditor'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        if (in_array($data['role'], ['super_admin', 'data_admin', 'auditor'], true) && $data['organization_id'] !== null) {
            throw ValidationException::withMessages(['organization_id' => ['Peran global tidak memakai organisasi.']]);
        }
        if (in_array($data['role'], ['admin_opd', 'reviewer', 'editor', 'viewer'], true) && ! $data['organization_id']) {
            throw ValidationException::withMessages(['organization_id' => ['Peran OPD memerlukan organisasi.']]);
        }
        $recordId = $id ?: ($data['id'] ?? null);
        $membership = DB::transaction(function () use ($request, $data, $recordId): OrganizationMembership {
            // Serialize global-admin edits so two concurrent requests cannot remove the last active super admin.
            $activeSuperAdmins = OrganizationMembership::query()->whereNull('organization_id')->where('role', 'super_admin')
                ->where('is_active', true)->whereHas('user', fn ($query) => $query->where('is_active', true))
                ->lockForUpdate()->get();
            $membership = $recordId
                ? OrganizationMembership::query()->lockForUpdate()->findOrFail($recordId)
                : new OrganizationMembership;
            $removesSuperAdmin = $membership->exists
                && $membership->organization_id === null
                && $membership->role === 'super_admin'
                && (bool) $membership->is_active
                && ((($data['organization_id'] ?? null) !== null) || $data['role'] !== 'super_admin' || ! ($data['is_active'] ?? true));
            if ($removesSuperAdmin && $activeSuperAdmins->count() <= 1) {
                throw ValidationException::withMessages(['role' => ['Setidaknya satu administrator super aktif harus tetap tersedia.']]);
            }
            $membership->fill([
                'user_id' => $data['user_id'], 'organization_id' => $data['organization_id'], 'role' => $data['role'],
                'is_active' => $data['is_active'] ?? ($membership->exists ? $membership->is_active : true),
                'created_by' => $membership->exists && $membership->created_by ? $membership->created_by : $request->user()->id,
            ])->save();
            $this->audit->record($request->user()->id, $recordId ? 'membership.update' : 'membership.create', 'membership', $membership->id, $membership->organization_id, 'success', ['role' => $membership->role, 'user_id' => $membership->user_id]);

            return $membership->fresh(['organization']);
        }, 3);

        return response()->json(['data' => $membership], $recordId ? 200 : 201, ['Cache-Control' => 'no-store']);
    }

    public function inviteUser(Request $request): JsonResponse
    {
        $actor = $request->user();
        $this->access->requireAnyRole($actor, ['super_admin', 'data_admin']);
        $isSuperAdmin = $this->access->hasAnyRole($actor, ['super_admin']);
        $assignableRoles = $isSuperAdmin
            ? ['super_admin', 'data_admin', 'admin_opd', 'reviewer', 'editor', 'viewer', 'auditor']
            : ['admin_opd', 'reviewer', 'editor', 'viewer'];
        $data = $request->validate([
            'email' => ['required', 'email:rfc', 'max:254'],
            'display_name' => ['required', 'string', 'min:2', 'max:120'],
            'organization_id' => ['present', 'nullable', 'uuid', 'exists:organizations,id'],
            'role' => ['required', 'in:'.implode(',', $assignableRoles)],
        ]);
        if (in_array($data['role'], ['super_admin', 'data_admin', 'auditor'], true) && $data['organization_id'] !== null) {
            throw ValidationException::withMessages(['organization_id' => ['Peran global tidak memakai organisasi.']]);
        }
        if (in_array($data['role'], ['admin_opd', 'reviewer', 'editor', 'viewer'], true) && ! $data['organization_id']) {
            throw ValidationException::withMessages(['organization_id' => ['Peran OPD memerlukan organisasi.']]);
        }

        $result = DB::transaction(function () use ($data, $actor): array {
            $email = mb_strtolower(trim($data['email']));
            $user = User::query()->where('email', $email)->lockForUpdate()->first();
            $isNew = ! $user;
            if ($isNew) {
                $user = User::query()->create([
                    'email' => $email,
                    'password' => Str::random(64),
                    'display_name' => trim($data['display_name']),
                    'is_active' => true,
                ]);
                Profile::query()->create(['user_id' => $user->id, 'display_name' => trim($data['display_name']), 'is_active' => true]);
            } elseif (! $user->is_active) {
                throw ValidationException::withMessages(['email' => ['Akun ini dinonaktifkan. Aktifkan kembali melalui prosedur administrator sebelum menambahkan akses.']]);
            }

            $membership = OrganizationMembership::query()->firstOrCreate(
                ['user_id' => $user->id, 'organization_id' => $data['organization_id'], 'role' => $data['role']],
                ['is_active' => true, 'created_by' => $actor->id],
            );
            if (! $membership->wasRecentlyCreated && ! $membership->is_active) {
                $membership->is_active = true;
                $membership->created_by = $actor->id;
                $membership->save();
            }

            return [$user, $membership, $isNew];
        });
        [$user, $membership, $isNew] = $result;
        if ($isNew) {
            try {
                Password::sendResetLink(['email' => $user->email]);
            } catch (\Throwable $error) {
                Log::error('Invitation reset notification failed', ['exception_class' => $error::class]);
            }
        }
        $this->audit->record($request->user()->id, 'user.invite', 'user', $user->id, $data['organization_id'], 'success', ['role' => $data['role'], 'new_user' => $isNew]);

        return response()->json(['data' => ['user_id' => $user->id, 'email' => $user->email, 'membership_id' => $membership->id, 'invitation_status' => $isNew ? 'created' : 'membership_added']], 201, ['Cache-Control' => 'no-store']);
    }

    public function profiles(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->access->requireAnyRole($user, AccessService::ALL_ROLES);
        $ids = collect(explode(',', (string) $request->query('user_ids', '')))
            ->filter(fn ($id) => is_string($id) && preg_match('/^[0-9a-fA-F-]{36}$/', $id))
            ->take(200)->values()->all();

        $canReadAllProfiles = $this->access->hasAnyRole($user, ['super_admin', 'data_admin', 'auditor']);
        if (! $canReadAllProfiles && $this->access->hasAnyRole($user, ['admin_opd', 'reviewer'])) {
            $organizationIds = $this->access->accessibleOrganizationIds($user);
            $visibleUserIds = $organizationIds === [] ? [] : OrganizationMembership::query()
                ->whereIn('organization_id', $organizationIds)->where('is_active', true)
                ->pluck('user_id')->unique()->values()->all();
            $visibleUserIds[] = $user->id;
            $ids = array_values(array_intersect($ids, array_unique($visibleUserIds)));
        } elseif (! $canReadAllProfiles) {
            $ids = array_values(array_intersect($ids, [$user->id]));
        }
        if ($ids === []) {
            return response()->json(['data' => []], 200, ['Cache-Control' => 'private, no-store']);
        }
        $rows = DB::table('profiles')->whereIn('user_id', $ids)->get(['user_id', 'display_name', 'is_active', 'onboarding_completed_at']);

        return response()->json(['data' => $rows], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function harvestRuns(Request $request): JsonResponse
    {
        $this->access->requireAnyRole($request->user(), ['super_admin', 'data_admin', 'auditor']);
        $rows = DB::table('sdi_harvest_runs')->orderByDesc('created_at')->limit(min(100, max(1, (int) $request->query('limit', 20))))->get(['id', 'target', 'run_type', 'status', 'summary', 'sample_issues', 'safe_error_message', 'started_at', 'finished_at', 'requested_by', 'created_at']);

        return response()->json(['data' => $rows], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function sdiRegistryCatalog(Request $request): JsonResponse
    {
        $this->access->requireAnyRole($request->user(), ['super_admin', 'data_admin', 'admin_opd', 'reviewer', 'editor', 'viewer', 'auditor']);
        $standards = DB::table('sdi_standard_registry')->orderBy('standard_type')->orderBy('title')->limit(1000)->get();
        $systems = DB::table('reference_code_systems')->orderBy('title')->limit(1000)->get();
        $entries = DB::table('reference_code_entries as e')->join('reference_code_systems as s', 's.id', '=', 'e.system_id')->orderBy('e.system_id')->orderBy('e.code')->limit(5000)->get(['e.*', 's.system_code as joined_system_code', 's.title as joined_system_title', 's.status as joined_system_status', 's.version_label as joined_system_version_label'])->map(function ($entry) {
            $row = (array) $entry;
            $row['reference_code_systems'] = ['system_code' => $row['joined_system_code'], 'title' => $row['joined_system_title'], 'status' => $row['joined_system_status'], 'version_label' => $row['joined_system_version_label']];
            unset($row['joined_system_code'], $row['joined_system_title'], $row['joined_system_status'], $row['joined_system_version_label']);

            return $row;
        });

        return response()->json(['data' => ['standards' => $standards, 'systems' => $systems, 'entries' => $entries]], 200, ['Cache-Control' => 'private, no-store']);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->access->requireAnyRole($user, ['super_admin', 'data_admin', 'admin_opd', 'reviewer', 'auditor']);
        $query = DB::table('audit_logs as a')->leftJoin('profiles as p', 'p.user_id', '=', 'a.actor_user_id')->leftJoin('organizations as o', 'o.id', '=', 'a.organization_id')->select('a.id', 'a.actor_user_id', 'p.display_name as actor_display_name', 'a.action', 'a.entity_type', 'a.entity_id', 'a.organization_id', 'o.name as organization_name', 'a.outcome', 'a.summary', 'a.request_id', 'a.created_at')->orderByDesc('a.created_at');
        if (! $this->access->hasAnyRole($user, AccessService::GLOBAL_ROLES)) {
            $organizationIds = $this->access->accessibleOrganizationIds($user);
            if ($organizationIds === []) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('a.organization_id', $organizationIds);
            }
        }
        $data = $query->limit(min(500, max(1, (int) $request->query('limit', 100))))->get();

        return response()->json(['data' => $data], 200, ['Cache-Control' => 'private, no-store']);
    }
}
