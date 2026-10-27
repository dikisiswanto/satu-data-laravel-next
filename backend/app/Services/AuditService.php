<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuditService
{
    public function record(?string $actorId, string $action, string $entityType, ?string $entityId = null, ?string $organizationId = null, string $outcome = 'success', array $summary = []): void
    {
        $candidateRequestId = (string) request()->header('X-Request-Id', '');
        $requestId = preg_match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/', $candidateRequestId)
            ? strtolower($candidateRequestId)
            : (string) Str::uuid();

        DB::table('audit_logs')->insert([
            'actor_user_id' => $actorId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'organization_id' => $organizationId,
            'outcome' => in_array($outcome, ['success', 'denied', 'failure'], true) ? $outcome : 'failure',
            'request_id' => $requestId,
            'summary' => json_encode($summary, JSON_THROW_ON_ERROR),
            'created_at' => now(),
        ]);
    }
}
