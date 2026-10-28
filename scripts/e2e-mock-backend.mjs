import { createServer } from "node:http";

const host = "127.0.0.1";
const port = Number(process.env.E2E_BACKEND_PORT || 8010);
const sessions = new Map();

function send(response, status, data, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(data));
}

createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  if (url.pathname === "/health") {
    send(response, 200, { status: "ok" });
    return;
  }

  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (url.pathname === "/api/v1/auth/me") {
    if (!token || token === "e2e-invalid-session") {
      send(response, 401, {
        message: "Unauthenticated",
        error: "unauthenticated",
      });
      return;
    }
    send(response, 200, {
      data: { id: 1, name: "Pengelola E2E", email: "e2e@example.test" },
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
    if (token === "e2e-rate-limited-session") {
      const attempts = sessions.get(token) || 0;
      sessions.set(token, attempts + 1);
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
      data: { roles: ["super_admin"], permissions: ["*"], memberships: [] },
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
