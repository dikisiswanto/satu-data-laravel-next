import { describe, expect, it, vi } from "vitest";
import {
  readApiMutationResponse,
  readApiResponse,
} from "../../src/lib/api/client-response.js";

describe("readApiResponse", () => {
  it("returns a JSON object from a successful API response", async () => {
    const response = {
      json: vi.fn().mockResolvedValue({ data: { id: "123" } }),
    };
    await expect(readApiResponse(response)).resolves.toEqual({
      data: { id: "123" },
    });
  });

  it("returns an empty object when a proxy responds with non-JSON", async () => {
    const response = {
      json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token <")),
    };
    await expect(readApiResponse(response)).resolves.toEqual({});
  });

  it("rejects array payloads as API envelopes", async () => {
    const response = {
      json: vi.fn().mockResolvedValue([{ error: "forbidden" }]),
    };
    await expect(readApiResponse(response)).resolves.toEqual({});
  });
});

describe("readApiMutationResponse", () => {
  it("rejects an empty or non-JSON 2xx response rather than implying a write succeeded", async () => {
    const response = {
      ok: true,
      json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token <")),
    };
    await expect(readApiMutationResponse(response)).rejects.toMatchObject({
      code: "invalid_api_response",
    });
  });

  it("accepts an empty 204 response as a successful mutation", async () => {
    const response = {
      ok: true,
      status: 204,
      url: "http://portal.local/api/v1/portal/organizations/123",
      headers: { get: vi.fn().mockReturnValue(null) },
      json: vi.fn().mockRejectedValue(new SyntaxError("No Content")),
    };

    await expect(
      readApiMutationResponse(response, { notify: false }),
    ).resolves.toEqual({});
  });

  it("normalizes Laravel validation errors into form field issues", async () => {
    const response = {
      ok: false,
      status: 422,
      url: "http://portal.local/api/v1/portal/organizations",
      headers: { get: vi.fn().mockReturnValue(null) },
      json: vi.fn().mockResolvedValue({
        message: "The given data was invalid.",
        errors: {
          code: ["Kode sudah digunakan."],
          "address.city": ["Kota wajib diisi."],
        },
      }),
    };

    const payload = await readApiMutationResponse(response, { notify: false });
    expect(payload.error).toBe("validation_failed");
    expect(payload.issues).toEqual([
      { path: ["code"], message: "Kode sudah digunakan." },
      { path: ["address", "city"], message: "Kota wajib diisi." },
    ]);
  });

  it("keeps explicit non-2xx API error bodies available to domain-specific handlers", async () => {
    const response = {
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "forbidden" }),
    };
    await expect(readApiMutationResponse(response)).resolves.toEqual({
      error: "forbidden",
    });
  });

  it("attaches a backend request id to an error envelope for support diagnostics", async () => {
    const response = {
      ok: false,
      status: 500,
      headers: {
        get: vi.fn().mockReturnValue("6d71eaba-6a79-4a0b-ae7a-e9b56fca7dd1"),
      },
      json: vi.fn().mockResolvedValue({ error: "service_unavailable" }),
    };

    await expect(readApiMutationResponse(response)).resolves.toEqual({
      error: "service_unavailable",
      request_id: "6d71eaba-6a79-4a0b-ae7a-e9b56fca7dd1",
    });
  });
});
