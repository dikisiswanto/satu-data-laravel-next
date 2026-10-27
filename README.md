# Satu Data Wajo v6

Satu Data Wajo is a data catalog and administration portal for Kabupaten Wajo. This release is a deliberate backend/domain redesign; the public Next.js UI and existing page routes are retained, while the Laravel API remains the single source of truth.

## Stack

- Next.js standalone production frontend
- Laravel API with Sanctum tokens
- MariaDB as persistent relational database
- Laravel queue worker for data conversion and long-running work
- Private Laravel Storage abstraction (local volume or S3-compatible storage)
- Docker Compose for isolated per-service deployment
- OpenAPI 3.1 in `backend/openapi/openapi.json` and `.yaml`

## Fresh setup and domain deployment

For a new deployment, generate non-repeating credentials and align the application origins with one public HTTPS domain:

```bash
bash scripts/setup-env.sh https://data.domain-anda.go.id
```

The setup script creates `.env` and `backend/.env` only when neither already exists, generates unique DB credentials and Laravel `APP_KEY`, locks file permissions, and prints the remaining deployment steps. It refuses to overwrite existing configuration. If you already have environment files, back them up and update values deliberately rather than rerunning the generator over them.

1. Point the domain DNS to the VPS, or configure Cloudflare Tunnel and its public hostname.
2. For host Nginx/Caddy, terminate HTTPS at the host reverse proxy and proxy to the edge bound to `127.0.0.1:8080`. Copy `deploy/vps-host-nginx.example.conf` to your host configuration, replace every example domain/certificate path, issue a valid certificate, then test and reload Nginx. Do not expose Laravel PHP-FPM or the internal API gateway directly to the Internet.
3. Confirm `NEXT_PUBLIC_SITE_URL` in root `.env` exactly matches `FRONTEND_URL` in `backend/.env`; also keep `APP_URL` and `API_PUBLIC_URL` aligned with the canonical origin. Set SMTP settings in `backend/.env` before relying on password reset.
4. For a Cloudflare Tunnel deployment, add your actual tunnel token to root `.env`, create the corresponding hostname-to-`http://edge:80` route in Cloudflare, then start it with `docker compose --profile tunnel up -d cloudflared`. Do not commit the token.
5. For a fresh v6 installation, use an empty database volume. This version intentionally changes the initial schema; it is not an in-place upgrade of the v5 migration history. Back up and rehearse any legacy import against a staging copy first.
6. Deploy through the release script, which validates configuration, builds both images, and waits for both the Laravel health endpoint and the frontend to respond:

```bash
bash scripts/deploy-vps.sh
```

The frontend embeds `NEXT_PUBLIC_SITE_URL` at build time. If the canonical domain changes, update both environment files and rerun the deploy script so the frontend image is rebuilt. The deploy script verifies service readiness locally via the edge; after DNS/TLS setup, still verify the external HTTPS hostname and sign-in flow.

If the project is disposable and you explicitly intend to discard the existing local database and uploads, stop the stack and remove volumes before starting v6:

```bash
docker compose down -v
```

**Warning:** `down -v` permanently deletes named volumes used by this Compose project. Never run it against production or any environment whose data must be retained.

## First administrator

Create the first administrator in the fresh environment with `docker compose exec api php artisan app:create-admin admin@example.go.id --name="Administrator Satu Data"`. Use the intended administrator email and restrict shell access during bootstrap. Do not commit a production password, access token, or secret into the repository; follow the command prompts and rotate credentials after first login.

## Architecture

Read `ARCHITECTURE.md` for bounded contexts, database invariants, authorization model, API compatibility, cache rules, and migration policy. Read `BACKEND-REWRITE-AUDIT.md` for changes and remaining release gates. `API-CONTRACTS.md` summarizes the canonical API and frontend integration invariants. `SDI-COMPLIANCE-MATRIX.md` maps software capabilities to the four SDI principles and separates technical readiness from official institutional validation.

## Public frontend compatibility

Public page layout and routes are intentionally preserved. Existing `/api/v1/*` public endpoints and legacy aliases remain during transition. UI components should call the existing frontend data adapter; do not embed SQL/table assumptions into React components. When an API response shape changes, update both OpenAPI documents and add a contract test before changing the frontend adapter.

## Testing

```bash
cd backend
composer install
php artisan test
```

Run the suite against MariaDB in CI/staging as well as SQLite where supported. Composite foreign keys, collation, JSON behavior, and query plans must be tested against the same MariaDB major version used by Docker. Frontend checks:

```bash
npm ci
npm run lint
npm run test
npm run build
```

Runtime/build tests were not executed in the authoring environment; do not treat syntax checks as proof of production readiness.
