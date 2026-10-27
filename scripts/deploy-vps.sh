#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

read_env() {
  local file="$1" key="$2"
  sed -n "s/^${key}=//p" "$file" | tail -n 1 | sed -e 's/^"//' -e 's/"$//'
}

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is required. Install Docker Engine + Compose v2 first." >&2
  exit 2
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to verify API and public frontend readiness." >&2
  exit 2
fi
if [[ ! -f .env || ! -f backend/.env ]]; then
  echo "Missing .env or backend/.env. Run 'bash scripts/setup-env.sh https://domain-anda.go.id' first." >&2
  exit 2
fi
DB_PASSWORD="$(read_env .env DB_PASSWORD)"
DB_ROOT_PASSWORD="$(read_env .env DB_ROOT_PASSWORD)"
if [[ "$DB_PASSWORD" == replace-with-* || "$DB_ROOT_PASSWORD" == replace-with-* ]]; then
  echo "Replace DB_PASSWORD and DB_ROOT_PASSWORD in root .env before deploying." >&2
  exit 2
fi
if [[ ${#DB_PASSWORD} -lt 32 || ${#DB_ROOT_PASSWORD} -lt 32 || "$DB_PASSWORD" == "$DB_ROOT_PASSWORD" ]]; then
  echo "Use distinct database and root passwords, each at least 32 characters (the setup script generates these automatically)." >&2
  exit 2
fi
APP_KEY_VALUE="$(read_env backend/.env APP_KEY)"
if [[ -z "$APP_KEY_VALUE" || "$APP_KEY_VALUE" == base64:AAAAAAAA* ]]; then
  echo "Set a unique APP_KEY in backend/.env before deploying." >&2
  exit 2
fi
APP_DEBUG_VALUE="$(read_env backend/.env APP_DEBUG | tr '[:upper:]' '[:lower:]')"
if [[ "$APP_DEBUG_VALUE" == true || "$APP_DEBUG_VALUE" == 1 || "$APP_DEBUG_VALUE" == yes ]]; then
  echo "APP_DEBUG must remain false in a production deployment." >&2
  exit 2
fi
SITE_URL="$(read_env .env NEXT_PUBLIC_SITE_URL)"
FRONTEND_URL="$(read_env backend/.env FRONTEND_URL)"
if [[ ! "$SITE_URL" =~ ^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then
  echo "NEXT_PUBLIC_SITE_URL must be a canonical HTTPS origin without path, query, or trailing slash." >&2
  exit 2
fi
if [[ "$FRONTEND_URL" != "$SITE_URL" ]]; then
  echo "Domain mismatch: FRONTEND_URL in backend/.env must exactly match NEXT_PUBLIC_SITE_URL in root .env." >&2
  echo "This origin is used by same-origin mutation checks and password-reset links." >&2
  exit 2
fi
for key in APP_URL API_PUBLIC_URL; do
  configured_url="$(read_env backend/.env "$key")"
  if [[ "$configured_url" != "$SITE_URL" ]]; then
    echo "Domain mismatch: $key in backend/.env must match the canonical public origin $SITE_URL." >&2
    exit 2
  fi
done
if [[ "$(read_env backend/.env APP_ENV)" != "production" ]]; then
  echo "APP_ENV must be production for the VPS deploy script." >&2
  exit 2
fi

# Validate Compose interpolation before building images or running migrations.
docker compose config --quiet
# Build frontend after URL/config changes because NEXT_PUBLIC_SITE_URL is embedded at build time.
docker compose build api
docker compose build frontend
docker compose up -d --no-build
docker compose ps

edge_binding="$(docker compose port edge 80 | head -n 1 || true)"
edge_host="${edge_binding%:*}"
edge_port="${edge_binding##*:}"
if [[ -z "$edge_port" || "$edge_binding" == "$edge_port" ]]; then
  edge_port="$(read_env .env EDGE_PORT)"
  edge_port="${edge_port:-8080}"
  edge_host="127.0.0.1"
fi
if [[ "$edge_host" == "0.0.0.0" || "$edge_host" == "::" || -z "$edge_host" ]]; then edge_host="127.0.0.1"; fi
LOCAL_ORIGIN="http://${edge_host}:${edge_port}"

api_ready=false
frontend_ready=false
echo "Waiting for API and frontend readiness via the internal edge..."
for attempt in $(seq 1 45); do
  if curl --fail --silent --show-error --connect-timeout 1 --max-time 3 "$LOCAL_ORIGIN/api/health" >/dev/null 2>&1; then api_ready=true; else api_ready=false; fi
  if curl --fail --silent --connect-timeout 1 --max-time 3 "$LOCAL_ORIGIN/" >/dev/null 2>&1; then frontend_ready=true; else frontend_ready=false; fi
  if [[ "$api_ready" == true && "$frontend_ready" == true ]]; then
    echo "API health: OK"
    echo "Public frontend: OK"
    echo "Local edge origin: $LOCAL_ORIGIN"
    echo "Canonical public URL: $SITE_URL"
    echo "Next: verify the public HTTPS URL and sign in with the bootstrap administrator."
    exit 0
  fi
  sleep 2
done

echo "Readiness check failed (API=$api_ready, frontend=$frontend_ready). Inspect service logs:" >&2
docker compose ps >&2
docker compose logs --tail=100 api api-http db queue frontend edge >&2
exit 1
