/**
 * Keep dashboard visibility and task priority deterministic. This is UI logic
 * only; Laravel remains authoritative for every authorization decision.
 */
const GLOBAL_ROLES = new Set(["super_admin", "data_admin", "auditor"]);
const CREATE_ROLES = new Set(["super_admin", "data_admin", "admin_opd", "editor"]);
const REVIEW_ROLES = new Set(["super_admin", "data_admin", "admin_opd", "reviewer"]);
const INTEGRATION_ROLES = new Set(["super_admin", "data_admin", "admin_opd", "reviewer", "editor", "auditor"]);
const USER_ADMIN_ROLES = new Set(["super_admin", "data_admin"]);
const USER_AUDIT_ROLES = new Set(["auditor"]);

function containsAny(values, accepted) {
  return values.some((value) => accepted.has(value));
}

function readCount(summary, key, available) {
  if (!available) return null;
  const value = summary?.[key];
  if (value === null || value === undefined || value === "") return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function buildDashboardViewModel({ memberships, summary, error = false }) {
  const membershipDataAvailable = Array.isArray(memberships);
  const activeMemberships = membershipDataAvailable
    ? memberships.filter((membership) => membership?.is_active !== false)
    : [];
  const roles = [...new Set(activeMemberships.map((membership) => membership?.role).filter((role) => typeof role === "string"))];
  const globalMembership = activeMemberships.some(
    (membership) => (membership.organization_id === null || membership.organization_id === undefined) && GLOBAL_ROLES.has(membership.role),
  );
  const organizationIds = [...new Set(
    activeMemberships
      .map((membership) => membership.organization_id)
      .filter((id) => typeof id === "string" && id.length > 0),
  )];
  const hasScope = membershipDataAvailable && (globalMembership || organizationIds.length > 0);
  const canCreateDataset = containsAny(roles, CREATE_ROLES);
  const canReviewQueue = containsAny(roles, REVIEW_ROLES);
  const canManageIntegrations = containsAny(roles, INTEGRATION_ROLES);
  const canManageUsers = containsAny(roles, USER_ADMIN_ROLES);
  const canViewUserAccess = canManageUsers || containsAny(roles, USER_AUDIT_ROLES);
  const summaryAvailable = !error && summary != null && typeof summary === "object";
  const total = readCount(summary, "total", summaryAvailable && hasScope);
  const review = readCount(summary, "review", summaryAvailable && hasScope);
  const draft = readCount(summary, "draft", summaryAvailable && hasScope);
  const latestDatasets = Array.isArray(summary?.recent) ? summary.recent : [];

  let nextTask;
  if (!membershipDataAvailable) {
    nextTask = {
      title: "Ringkasan belum dapat dimuat",
      description: "Status akses akun belum berhasil diperiksa. Muat ulang halaman sebelum mengambil tindakan yang bergantung pada angka ringkasan.",
      action: "Muat ulang setelah memeriksa koneksi",
      href: "/portal",
      state: "unavailable",
    };
  } else if (!hasScope) {
    nextTask = {
      title: "Akses organisasi belum tersedia",
      description: "Akun ini belum terhubung ke organisasi aktif. Administrator portal perlu menetapkan organisasi dan peran yang sesuai.",
      action: "Kembali ke ringkasan",
      href: "/portal",
      state: "no-scope",
    };
  } else if (error || total === null || review === null || draft === null) {
    nextTask = {
      title: "Ringkasan data belum berhasil dimuat",
      description: "Angka tidak ditampilkan sebagai nol karena data belum dapat dipastikan. Buka katalog untuk memeriksa status sebenarnya.",
      action: "Buka katalog dataset",
      href: "/portal/dataset",
      state: "unavailable",
    };
  } else if ((review ?? 0) > 0 && canReviewQueue) {
    nextTask = {
      title: "Periksa dataset yang menunggu keputusan",
      description: `${review.toLocaleString("id-ID")} dataset menunggu tindak lanjut pemeriksaan. Periksa sumber, metadata, dan hasil validasi sebelum memutuskan.`,
      action: "Buka pemeriksaan data",
      href: "/portal/review",
      state: "review",
    };
  } else if ((draft ?? 0) > 0 && canCreateDataset) {
    nextTask = {
      title: "Lanjutkan dataset yang masih berupa draf",
      description: `${draft.toLocaleString("id-ID")} draf masih dapat dilengkapi. Periksa metadata dan proses berkas sumber sebelum mengajukan pemeriksaan.`,
      action: "Lanjutkan draf",
      href: "/portal/dataset?status=draft",
      state: "draft",
    };
  } else if (total === 0 && canCreateDataset) {
    nextTask = {
      title: "Mulai katalog data Anda",
      description: "Buat satu dataset dengan organisasi pengampu serta sumber yang jelas. Berkas dapat ditambahkan setelah draf tersimpan.",
      action: "Buat dataset pertama",
      href: "/portal/dataset/new",
      state: "empty",
    };
  } else if (canCreateDataset) {
    nextTask = {
      title: "Lanjutkan pengelolaan katalog",
      description: "Buka daftar dataset untuk membuat data baru, memperbarui draf, atau memeriksa status pemrosesan yang sedang berjalan.",
      action: "Kelola dataset",
      href: "/portal/dataset",
      state: "catalog",
    };
  } else {
    nextTask = {
      title: "Temukan data dalam cakupan akses Anda",
      description: "Gunakan katalog untuk mencari dataset dan memeriksa statusnya. Tindakan perubahan hanya tersedia untuk peran yang sesuai.",
      action: "Buka katalog dataset",
      href: "/portal/dataset",
      state: "catalog",
    };
  }

  return {
    roles,
    hasScope,
    membershipDataAvailable,
    globalMembership,
    canCreateDataset,
    canReviewQueue,
    canManageIntegrations,
    canManageUsers,
    canViewUserAccess,
    summaryAvailable,
    counts: { total, review, draft },
    latestDatasets,
    nextTask,
  };
}
