#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SITE_URL="${1:-}"
if [[ -z "$SITE_URL" ]]; then
  read -r -p "URL publik kanonis (mis. https://data.wajo.go.id): " SITE_URL
fi
if [[ ! "$SITE_URL" =~ ^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then
  echo "URL harus berupa origin HTTPS saja, tanpa path/query/trailing slash (contoh: https://data.wajo.go.id)." >&2
  exit 2
fi

if [[ -e .env || -e backend/.env ]]; then
  echo "Tidak mengubah konfigurasi yang sudah ada. Salah satu .env telah tersedia." >&2
  echo "Cadangkan konfigurasi sekarang, lalu jalankan kembali hanya setelah Anda menyiapkan file .env yang ingin dipertahankan atau dipindahkan." >&2
  exit 2
fi
if [[ ! -f .env.example || ! -f backend/.env.example ]]; then
  echo "File contoh .env tidak lengkap; jalankan script dari source project Satu Data Wajo." >&2
  exit 2
fi
command -v openssl >/dev/null 2>&1 || { echo "openssl diperlukan untuk membuat secret acak." >&2; exit 2; }

set_env() {
  local file="$1" key="$2" value="$3"
  local escaped
  escaped="$(printf '%s' "$value" | sed 's/[&|]/\\&/g')"
  if grep -qE "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

cp .env.example .env
cp backend/.env.example backend/.env

DB_PASSWORD="$(openssl rand -hex 32)"
DB_ROOT_PASSWORD="$(openssl rand -hex 32)"
APP_KEY="base64:$(openssl rand -base64 32 | tr -d '\n')"

set_env .env NEXT_PUBLIC_SITE_URL "$SITE_URL"
set_env .env DB_DATABASE "satu_data_wajo"
set_env .env DB_USERNAME "satu_data_wajo"
set_env .env DB_PASSWORD "$DB_PASSWORD"
set_env .env DB_ROOT_PASSWORD "$DB_ROOT_PASSWORD"
set_env .env EDGE_BIND_ADDRESS "127.0.0.1"
set_env .env EDGE_PORT "8080"
set_env .env CLOUDFLARE_TUNNEL_TOKEN ""

set_env backend/.env APP_KEY "$APP_KEY"
set_env backend/.env APP_ENV "production"
set_env backend/.env APP_DEBUG "false"
set_env backend/.env APP_URL "$SITE_URL"
set_env backend/.env API_PUBLIC_URL "$SITE_URL"
set_env backend/.env FRONTEND_URL "$SITE_URL"
set_env backend/.env DB_HOST "db"
set_env backend/.env DB_PORT "3306"
set_env backend/.env DB_DATABASE "satu_data_wajo"
set_env backend/.env DB_USERNAME "satu_data_wajo"
set_env backend/.env DB_PASSWORD "$DB_PASSWORD"
set_env backend/.env TRUSTED_PROXIES "*"

chmod 600 .env backend/.env
cat <<SUMMARY
Environment files created with unique database credentials and Laravel APP_KEY.
Canonical origin: $SITE_URL

Before deployment:
  1. Configure DNS for this hostname to your VPS (or prepare a Cloudflare Tunnel).
  2. For host Nginx, issue TLS certificates and replace the example host/certificate paths in deploy/vps-host-nginx.example.conf.
  3. Configure SMTP values in backend/.env so password-reset messages can be delivered.
  4. Run: bash scripts/deploy-vps.sh

Keep .env and backend/.env secret. The frontend embeds NEXT_PUBLIC_SITE_URL at build time;
rerun the deploy script after changing the public domain. The script never prints secret values.
SUMMARY
