/* eslint-disable no-console */
import "server-only";

const GITHUB_API = "https://api.github.com";
const WORKFLOW_FILE = "conversion-worker.yml";
// The upload route uses Next.js after(), so this request runs after the response
// and should have enough time for normal GitHub API latency without hanging.
const DISPATCH_TIMEOUT_MS = 5000;
const DIAGNOSTIC_TIMEOUT_MS = 2500;

function safeRemoteMessage(value) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .slice(0, 180);
}

function hintForStatus(status, message) {
  const normalized = String(message || "").toLowerCase();
  if (
    normalized.includes("rate limit") ||
    normalized.includes("secondary rate limit")
  ) {
    return "Permintaan ke GitHub sedang dibatasi. Tunggu sebelum mencoba lagi; pekerjaan yang sudah masuk antrean tetap dapat diproses oleh jadwal pemulihan.";
  }
  if (status === 401 || normalized.includes("bad credentials")) {
    return "Periksa token GitHub; token mungkin kedaluwarsa atau tidak valid.";
  }
  if (status === 403) {
    return "GitHub menolak pemicu workflow. Untuk repository private, pastikan token memiliki akses ke repository yang tepat dan Actions = Read and write. Jika pengaturan sudah benar, buat token baru, perbarui secret di Vercel, lalu deploy ulang; periksa juga kebijakan Actions repository.";
  }
  if (status === 404) {
    return "GitHub memakai 404 untuk resource private yang tidak terlihat oleh token. Pastikan token diberi akses ke repository private dikisiswanto/satu-data-wajo, workflow ada di default branch, dan nama file persis conversion-worker.yml.";
  }
  if (status === 422) {
    return "Periksa nama workflow dan CONVERSION_WORKER_GITHUB_REF; ref harus menunjuk ke branch/tag yang valid dengan workflow_dispatch.";
  }
  if (status >= 500) {
    return "GitHub API sedang mengalami gangguan; antrean akan dikejar oleh workflow pemulihan terjadwal.";
  }
  return "Periksa konfigurasi GitHub Actions dan log workflow.";
}

function githubApiHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "satu-data-wajo-conversion-dispatch",
    "X-GitHub-Api-Version": "2026-03-10",
  };
}

async function githubGet(path, token) {
  return fetch(`${GITHUB_API}${path}`, {
    method: "GET",
    headers: githubApiHeaders(token),
    signal: AbortSignal.timeout(DIAGNOSTIC_TIMEOUT_MS),
  });
}

/**
 * GitHub intentionally masks some inaccessible private resources as 404.
 * Only probe after a failed dispatch, so successful uploads pay no extra API
 * round-trips. Never log tokens, response headers, or private repository data.
 */
async function diagnoseDispatch404(token, repository) {
  try {
    const repoResponse = await githubGet(`/repos/${repository}`, token);
    if (repoResponse.status === 404) {
      return {
        code: "repository_not_visible_to_token",
        hint: "GitHub tidak dapat melihat repository dengan token ini. Untuk repository private, periksa Fine-grained PAT: Resource owner harus cocok dengan pemilik repository, Repository access harus mencakup repository target, Actions = Read and write, dan token harus disetujui jika diwajibkan. Alternatif classic PAT harus memiliki scope repo.",
      };
    }
    if (!repoResponse.ok) {
      return {
        code: `repository_probe_http_${repoResponse.status}`,
        hint: "Repository tidak dapat diverifikasi setelah 404. Pastikan token memiliki akses ke repository private dan izin metadata/read yang diperlukan.",
      };
    }

    const repoPayload = await repoResponse.json().catch(() => ({}));
    const defaultBranch = safeRemoteMessage(
      repoPayload.default_branch || "unknown",
    );
    const workflowResponse = await githubGet(
      `/repos/${repository}/actions/workflows/${WORKFLOW_FILE}`,
      token,
    );
    if (workflowResponse.status === 404) {
      return {
        code: "workflow_not_found_on_default_branch",
        defaultBranch,
        hint: `Repository terlihat, tetapi GitHub tidak menemukan ${WORKFLOW_FILE} sebagai workflow. Pastikan file .github/workflows/conversion-worker.yml sudah di-commit dan di-push ke default branch (${defaultBranch}) dengan event workflow_dispatch.`,
      };
    }
    if (!workflowResponse.ok) {
      return {
        code: `workflow_probe_http_${workflowResponse.status}`,
        defaultBranch,
        hint: "Repository dapat diakses, tetapi pemeriksaan workflow gagal. Pastikan Actions permission = Read and write dan Actions diaktifkan di Settings repository.",
      };
    }

    const workflowPayload = await workflowResponse.json().catch(() => ({}));
    const state = safeRemoteMessage(workflowPayload.state || "unknown");
    if (state !== "active") {
      return {
        code: "workflow_not_active",
        defaultBranch,
        workflowState: state,
        hint: `Workflow ditemukan tetapi statusnya ${state}. Aktifkan kembali workflow di tab Actions sebelum dispatch.`,
      };
    }

    return {
      code: "dispatch_404_but_repository_and_workflow_are_visible",
      defaultBranch,
      workflowState: state,
      hint: "Repository dan workflow terlihat oleh token, tetapi endpoint dispatch tetap mengembalikan 404. Periksa Actions = Read and write, CONVERSION_WORKER_GITHUB_REF, apakah ref benar-benar ada, dan apakah workflow_dispatch sudah berada di default branch.",
    };
  } catch (error) {
    return {
      code:
        error?.name === "TimeoutError" || error?.name === "AbortError"
          ? "diagnostic_probe_timeout"
          : "diagnostic_probe_failed",
      hint: "Probe diagnostik 404 tidak selesai; periksa akses token ke repository private, default branch, dan file workflow secara manual.",
    };
  }
}

/**
 * Diagnose a 403 without revealing token material. A successful repository and
 * workflow read means the token can see the private repo, but dispatch access
 * is still denied (usually an effective permission/token-version/repo-policy issue).
 */
async function diagnoseDispatch403(token, repository) {
  try {
    const repoResponse = await githubGet(`/repos/${repository}`, token);
    if (repoResponse.status === 404) {
      return {
        code: "repository_not_visible_to_token",
        hint: "Token tidak dapat membaca repository private ini. Periksa Resource owner, Repository access yang dipilih, lalu perbarui secret Vercel dengan token yang benar.",
      };
    }
    if (!repoResponse.ok) {
      return {
        code: `repository_probe_http_${repoResponse.status}`,
        hint: "GitHub belum dapat memverifikasi akses repository. Pastikan token aktif, memiliki akses Metadata read, dan repository target sesuai.",
      };
    }

    const repoPayload = await repoResponse.json().catch(() => ({}));
    const defaultBranch = safeRemoteMessage(
      repoPayload.default_branch || "unknown",
    );
    const workflowResponse = await githubGet(
      `/repos/${repository}/actions/workflows/${WORKFLOW_FILE}`,
      token,
    );
    if (workflowResponse.status === 404) {
      return {
        code: "workflow_not_visible_or_not_found",
        defaultBranch,
        hint: `Repository dapat dibaca, tetapi workflow tidak ditemukan atau tidak dapat dibaca. Pastikan ${WORKFLOW_FILE} sudah berada di .github/workflows pada default branch (${defaultBranch}) dan Actions diaktifkan.`,
      };
    }
    if (!workflowResponse.ok) {
      return {
        code: `workflow_probe_http_${workflowResponse.status}`,
        defaultBranch,
        hint: "Repository terlihat, tetapi izin baca workflow ditolak. Periksa akses Actions pada token dan kebijakan GitHub Actions repository.",
      };
    }

    const workflowPayload = await workflowResponse.json().catch(() => ({}));
    const state = safeRemoteMessage(workflowPayload.state || "unknown");
    if (state !== "active") {
      return {
        code: "workflow_not_active",
        defaultBranch,
        workflowState: state,
        hint: `Workflow ditemukan tetapi berstatus ${state}. Aktifkan di tab Actions, lalu coba lagi.`,
      };
    }

    return {
      code: "workflow_visible_dispatch_forbidden",
      defaultBranch,
      workflowState: state,
      hint: "Token dapat membaca repository dan workflow, tetapi tidak diizinkan menjalankan workflow. Pastikan Fine-grained PAT mencakup repository ini dengan Actions = Read and write, tidak kedaluwarsa, dan secret token terbaru sudah disimpan di Vercel serta diikuti deployment baru. Periksa Settings → Actions → General. Private repository tetap didukung; status private saja bukan penyebab penolakan.",
    };
  } catch (error) {
    return {
      code:
        error?.name === "TimeoutError" || error?.name === "AbortError"
          ? "diagnostic_probe_timeout"
          : "diagnostic_probe_failed",
      hint: "Pemeriksaan akses GitHub tidak selesai. Periksa token dan konfigurasi repository secara manual; nilai token tidak dicatat.",
    };
  }
}

/**
 * Best-effort event-driven dispatch for the detached GitHub Actions worker.
 * Never make successful source registration depend on GitHub being available;
 * the scheduled workflow is the recovery path for queued jobs.
 */
export async function dispatchConversionWorker() {
  const token = process.env.CONVERSION_WORKER_GITHUB_TOKEN?.trim();
  const repository = process.env.CONVERSION_WORKER_GITHUB_REPOSITORY?.trim();
  const ref = process.env.CONVERSION_WORKER_GITHUB_REF?.trim() || "main";

  // Optional for local development. Do not fail upload just because the wake-up
  // is not configured, but leave enough diagnostics to identify that case.
  if (!token || !repository) {
    console.warn("conversion_worker_dispatch_skipped", {
      reason:
        !token && !repository
          ? "token_and_repository_missing"
          : !token
            ? "token_missing"
            : "repository_missing",
      scheduledRecoveryAvailable: true,
    });
    return false;
  }

  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ||
    !/^[A-Za-z0-9._/-]+$/.test(ref) ||
    ref.includes("..")
  ) {
    console.warn("conversion_worker_dispatch_config_invalid", {
      repositoryFormatValid: /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(
        repository,
      ),
      refFormatValid: /^[A-Za-z0-9._/-]+$/.test(ref) && !ref.includes(".."),
    });
    return false;
  }

  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: "POST",
        headers: githubApiHeaders(token),
        // Ask for a run id when the API supports returning run details.
        body: JSON.stringify({ ref, return_run_details: true }),
        signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
      },
    );

    const responseText = await response.text().catch(() => "");
    let payload = {};
    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = {};
      }
    }

    if (!response.ok) {
      const githubMessage = safeRemoteMessage(payload.message);
      // GitHub exposes the endpoint's required effective permission in this
      // response header. It helps distinguish a stale/mis-scoped token from a
      // repository policy issue without logging any token material.
      const acceptedPermissions = safeRemoteMessage(
        response.headers.get("x-accepted-github-permissions"),
      );
      const githubRequestId = safeRemoteMessage(
        response.headers.get("x-github-request-id"),
      );
      const rateLimitRemaining = safeRemoteMessage(
        response.headers.get("x-ratelimit-remaining"),
      );
      const diagnostic =
        response.status === 404
          ? await diagnoseDispatch404(token, repository)
          : response.status === 403
            ? await diagnoseDispatch403(token, repository)
            : null;
      console.warn("conversion_worker_dispatch_failed", {
        status: response.status,
        githubMessage: githubMessage || "no_message_returned",
        ...(acceptedPermissions ? { acceptedPermissions } : {}),
        ...(githubRequestId ? { githubRequestId } : {}),
        ...(rateLimitRemaining ? { rateLimitRemaining } : {}),
        hint: diagnostic?.hint || hintForStatus(response.status, githubMessage),
        ...(diagnostic
          ? {
              diagnosticCode: diagnostic.code,
              defaultBranch: diagnostic.defaultBranch || null,
              workflowState: diagnostic.workflowState || null,
            }
          : {}),
        workflow: WORKFLOW_FILE,
        repository,
        ref,
      });
      return false;
    }

    console.info("conversion_worker_dispatch_accepted", {
      status: response.status,
      workflow: WORKFLOW_FILE,
      repository,
      ref,
      workflowRunId: Number.isFinite(Number(payload.workflow_run_id))
        ? Number(payload.workflow_run_id)
        : null,
    });
    return true;
  } catch (error) {
    console.warn("conversion_worker_dispatch_failed", {
      errorCode: error?.name || "network_error",
      hint:
        error?.name === "TimeoutError" || error?.name === "AbortError"
          ? "GitHub API tidak merespons dalam batas waktu; cek koneksi Vercel dan log workflow pemulihan."
          : "Periksa koneksi keluar dari deployment Vercel ke api.github.com.",
      workflow: WORKFLOW_FILE,
      repository,
      ref,
    });
    return false;
  }
}
