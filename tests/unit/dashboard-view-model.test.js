import { describe, expect, it } from "vitest";
import { buildDashboardViewModel } from "../../src/lib/admin/dashboard-view-model.js";

const summary = (overrides = {}) => ({
  total: 5,
  review: 2,
  draft: 1,
  recent: [],
  ...overrides,
});
const membership = (role, organization_id = "org-1", is_active = true) => ({
  role,
  organization_id,
  is_active,
});

describe("admin dashboard view model", () => {
  it("does not treat a local membership with a global role code as global scope", () => {
    const view = buildDashboardViewModel({
      memberships: [membership("super_admin", "org-1")],
      summary: summary(),
    });

    expect(view.globalMembership).toBe(false);
    expect(view.hasScope).toBe(true);
  });

  it("requires an explicitly global membership for cross-organization scope", () => {
    const view = buildDashboardViewModel({
      memberships: [membership("data_admin", null)],
      summary: summary(),
    });

    expect(view.globalMembership).toBe(true);
    expect(view.hasScope).toBe(true);
  });

  it("never converts unavailable counts into zero", () => {
    const view = buildDashboardViewModel({
      memberships: [membership("viewer")],
      summary: summary({ total: null }),
    });

    expect(view.counts.total).toBeNull();
    expect(view.nextTask.state).toBe("unavailable");
  });

  it("prioritizes review work before drafts when the role permits review", () => {
    const view = buildDashboardViewModel({
      memberships: [membership("reviewer")],
      summary: summary(),
    });

    expect(view.canReviewQueue).toBe(true);
    expect(view.nextTask.state).toBe("review");
    expect(view.nextTask.href).toBe("/portal/review");
  });

  it("does not offer a review queue to an auditor-only account", () => {
    const view = buildDashboardViewModel({
      memberships: [membership("auditor", null)],
      summary: summary(),
    });

    expect(view.canReviewQueue).toBe(false);
    expect(view.canCreateDataset).toBe(false);
    expect(view.canManageUsers).toBe(false);
    expect(view.canViewUserAccess).toBe(true);
    expect(view.nextTask.state).toBe("catalog");
  });

  it("distinguishes an account without membership from a failed membership request", () => {
    const empty = buildDashboardViewModel({
      memberships: [],
      summary: summary(),
    });
    const failed = buildDashboardViewModel({
      memberships: null,
      summary: null,
      error: true,
    });

    expect(empty.nextTask.state).toBe("no-scope");
    expect(failed.nextTask.state).toBe("unavailable");
  });

  it("ignores disabled memberships", () => {
    const view = buildDashboardViewModel({
      memberships: [membership("super_admin", null, false)],
      summary: summary(),
    });

    expect(view.hasScope).toBe(false);
    expect(view.globalMembership).toBe(false);
  });
});
