import { createServer } from "node:http";

const host = "127.0.0.1";
const port = Number(process.env.E2E_BACKEND_PORT || 8010);
const sessions = new Map();
const organizations = [];

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100_000) reject(new Error("request_body_too_large"));
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function send(response, status, data, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(data));
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  if (url.pathname === "/health") {
    send(response, 200, { status: "ok" });
    return;
  }

  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  // Portal routes must be authenticated even for browser-originated requests.
  // E2E therefore catches regressions where the HttpOnly cookie is not converted
  // into an Authorization header by the Next.js portal API proxy.
  if (
    url.pathname.startsWith("/api/v1/portal/") &&
    (!token || token === "e2e-invalid-session")
  ) {
    send(response, 401, {
      message: "Unauthenticated",
      error: "unauthorized",
    });
    return;
  }

  if (url.pathname === "/api/v1/auth/me") {
    if (!token || token === "e2e-invalid-session") {
      send(response, 401, {
        message: "Unauthenticated",
        error: "unauthenticated",
      });
      return;
    }

    // The current workspace verifies /auth/me (not /portal/shell) and relies
    // on Laravel's serialized roles + memberships to authorize each module.
    // Reproduce one transient 429 here so the E2E test covers the real path.
    if (token === "e2e-rate-limited-session") {
      const key = `auth-me:${token}`;
      const attempts = sessions.get(key) || 0;
      sessions.set(key, attempts + 1);
      if (attempts === 0) {
        send(
          response,
          429,
          { message: "Terlalu banyak permintaan", error: "rate_limited" },
          { "retry-after": "1" },
        );
        return;
      }
    }

    send(response, 200, {
      data: {
        id: 1,
        display_name: "Pengelola E2E",
        email: "e2e@example.test",
        is_active: true,
        onboarding_completed_at: "2026-01-01T00:00:00.000Z",
        roles: ["super_admin"],
        memberships: [
          {
            id: "e2e-global-admin-membership",
            role: "super_admin",
            organization_id: null,
            is_active: true,
            organizations: null,
          },
        ],
      },
    });
    return;
  }

  if (url.pathname === "/api/v1/portal/shell") {
    if (!token) {
      send(response, 401, {
        message: "Unauthenticated",
        error: "unauthenticated",
      });
      return;
    }
    send(response, 200, {
      data: {
        roles: ["super_admin"],
        permissions: ["*"],
        memberships: [
          {
            role: "super_admin",
            organization_id: null,
            organizations: null,
          },
        ],
      },
    });
    return;
  }

  if (url.pathname === "/api/v1/public/stats") {
    send(response, 200, {
      data: {
        published_dataset_count: 0,
        public_organization_count: 0,
        published_indicator_count: 0,
      },
    });
    return;
  }

  if (url.pathname === "/api/v1/public/facets") {
    send(response, 200, {
      data: { categories: [], organizations: [], years: [] },
    });
    return;
  }

  if (url.pathname === "/api/v1/public/revision") {
    send(response, 200, {
      data: { revision: 1, updated_at: "2026-10-28T00:00:00.000Z" },
    });
    return;
  }

  if (url.pathname === "/api/v1/sdi/data.json") {
    send(response, 200, []);
    return;
  }

  if (url.pathname === "/api/v1/portal/audit-logs") {
    send(response, 200, {
      data: [
        {
          id: 1,
          actor_user_id: "9fef1102-b4ae-49a4-a4e7-6fa8ce691919",
          actor_display_name: "Pengelola E2E",
          action: "organization.update",
          entity_type: "organization",
          entity_id: "81186dd6-bc59-48fb-8f47-a98a2214f9e1",
          organization_id: "81186dd6-bc59-48fb-8f47-a98a2214f9e1",
          organization_name: "Dinas Contoh",
          outcome: "success",
          summary: {
            code: "ORG-01",
            changed_fields: ["name", "official_url"],
          },
          request_id: "78b3bd20-584f-46de-b49a-e27ca694f57a",
          created_at: "2026-10-28T02:00:00+08:00",
        },
      ],
    });
    return;
  }

  if (
    url.pathname === "/api/v1/portal/organizations" &&
    request.method === "GET"
  ) {
    send(response, 200, { data: organizations });
    return;
  }

  if (
    url.pathname === "/api/v1/portal/organizations" &&
    request.method === "POST"
  ) {
    try {
      const input = await readJsonBody(request);
      if (!input.code || !input.slug || !input.name) {
        send(response, 422, {
          message: "Validation failed",
          errors: { name: ["The name field is required."] },
        });
        return;
      }
      const organization = {
        id: "9fef1102-b4ae-49a4-a4e7-6fa8ce691920",
        code: input.code,
        slug: input.slug,
        name: input.name,
        short_name: input.short_name || null,
        description: input.description || null,
        official_email: input.official_email || null,
        official_url: input.official_url || null,
        is_active: input.is_active !== false,
      };
      organizations.push(organization);
      send(response, 201, { data: organization });
    } catch {
      send(response, 400, { error: "invalid_json" });
    }
    return;
  }

  if (
    url.pathname === "/api/v1/portal/memberships" &&
    request.method === "GET"
  ) {
    send(response, 200, {
      data: [
        {
          id: "a6faaf45-df16-4e22-930f-f54c7bf3a333",
          user_id: "9fef1102-b4ae-49a4-a4e7-6fa8ce691921",
          email: "operator@example.test",
          display_name: "Operator Contoh",
          organization_id: null,
          role: "data_admin",
          is_active: true,
          created_at: "2026-10-28T02:00:00+08:00",
          organizations: null,
        },
      ],
    });
    return;
  }

  if (url.pathname === "/api/v1/portal/dashboard") {
    send(response, 200, {
      data: {
        profile: { name: "Pengelola E2E", email: "e2e@example.test" },
        memberships: [],
        summary: {
          total: 0,
          review: 0,
          draft: 0,
          recent: [],
        },
      },
    });
    return;
  }

  send(response, 200, {
    data: [],
    meta: { current_page: 1, last_page: 1, total: 0 },
  });
}).listen(port, host);
