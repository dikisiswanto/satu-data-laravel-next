import "server-only";
import { cache } from "react";
import { backendFetch } from "@/lib/backend/server";

const TABLE_PATHS = {
  profiles: "/api/v1/portal/profile",
  organization_memberships: "/api/v1/portal/memberships",
  organizations: "/api/v1/portal/organizations",
  datasets: "/api/v1/portal/datasets",
  indicators: "/api/v1/portal/indicators",
  audit_logs: "/api/v1/portal/audit-logs",
  sdi_standard_registry: "/api/v1/portal/sdi/registry",
  reference_code_systems: "/api/v1/portal/sdi/registry",
  reference_code_entries: "/api/v1/portal/sdi/registry",
  sdi_harvest_runs: "/api/v1/portal/sdi/harvest-runs",
  public_catalog_revision: "/api/v1/public/revision",
};

function readPath(table, filters) {
  const get = (key) =>
    filters.find((filter) => filter.column === key && filter.op === "eq")
      ?.value;
  if (
    table === "dataset_versions" ||
    table === "conversion_jobs" ||
    table === "dataset_sdi_metadata" ||
    table === "dataset_resources"
  ) {
    const datasetId = get("dataset_id");
    return datasetId
      ? `/api/v1/portal/datasets/${encodeURIComponent(datasetId)}`
      : null;
  }
  if (table === "datasets") {
    const datasetId = get("id");
    return datasetId
      ? `/api/v1/portal/datasets/${encodeURIComponent(datasetId)}`
      : TABLE_PATHS.datasets;
  }
  if (table === "organizations") {
    const organizationId = get("id");
    return organizationId
      ? `/api/v1/portal/organizations/${encodeURIComponent(organizationId)}`
      : TABLE_PATHS.organizations;
  }
  if (table === "indicators") {
    const indicatorId = get("id");
    return indicatorId
      ? `/api/v1/portal/indicators/${encodeURIComponent(indicatorId)}`
      : TABLE_PATHS.indicators;
  }
  if (table === "indicator_observations") {
    const indicatorId = get("indicator_id");
    return indicatorId
      ? `/api/v1/portal/indicators/${encodeURIComponent(indicatorId)}/observations`
      : null;
  }
  if (table === "profiles") {
    const single = get("user_id");
    const ids = filters
      .filter((f) => f.column === "user_id" && f.op === "in")
      .flatMap((f) => f.value || []);
    const allIds = [...new Set([...(single ? [single] : []), ...ids])];
    return allIds.length
      ? `/api/v1/portal/profiles?user_ids=${encodeURIComponent(allIds.join(","))}`
      : TABLE_PATHS.profiles;
  }
  return TABLE_PATHS[table] || null;
}

function valueAt(item, path) {
  return String(path || "")
    .split(".")
    .reduce((value, key) => {
      if (value == null) return undefined;
      return value[key];
    }, item);
}

function asArray(payload, table) {
  if (Array.isArray(payload?.data)) return payload.data;
  const data = payload?.data;
  if (data == null) return [];
  if (table === "dataset_versions") return data.versions || [];
  if (table === "conversion_jobs") return data.conversion_jobs || [];
  if (table === "dataset_sdi_metadata") {
    if (Array.isArray(data.dataset_sdi_metadata))
      return data.dataset_sdi_metadata;
    return data.sdi_metadata ? [data.sdi_metadata] : [];
  }
  if (table === "dataset_resources")
    return data.dataset_resources || data.resources || [];
  if (table === "profiles") return [data];
  if (table === "sdi_standard_registry") return data.standards || [];
  if (table === "reference_code_systems") return data.systems || [];
  if (table === "reference_code_entries") return data.entries || [];
  return [data];
}

function normalizeRow(table, item, datasetId) {
  if (!item || typeof item !== "object") return item;
  const row = { ...item };
  if (table === "dataset_versions" && datasetId) row.dataset_id ||= datasetId;
  if (table === "conversion_jobs" && datasetId) row.dataset_id ||= datasetId;
  if (table === "dataset_sdi_metadata" && datasetId)
    row.dataset_id ||= datasetId;
  if (table === "public_catalog_revision") row.singleton ??= true;
  if (table === "datasets") {
    row.organizations ||= row.organization || null;
    row.dataset_resources ||= row.resources || [];
    if (!Array.isArray(row.dataset_sdi_metadata)) {
      row.dataset_sdi_metadata = row.sdi_metadata ? [row.sdi_metadata] : [];
    }
  }
  if (table === "indicators") row.organizations ||= row.organization || null;
  if (table === "audit_logs") {
    row.profiles ||= row.actor_display_name
      ? { display_name: row.actor_display_name }
      : null;
    row.organizations ||= row.organization_name
      ? { name: row.organization_name }
      : null;
  }
  if (
    table === "organization_memberships" &&
    !row.organizations &&
    row.organization
  )
    row.organizations = row.organization;
  if (
    table === "reference_code_entries" &&
    !row.reference_code_systems &&
    row.system_title
  ) {
    row.reference_code_systems = {
      system_code: row.system_code,
      title: row.system_title,
      status: row.system_status,
      version_label: row.version_label,
    };
  }
  return row;
}

function getLikeSearch(expression) {
  const match = String(expression || "").match(/\.ilike\.%([^%]*)%/i);
  return match?.[1]?.trim().slice(0, 100) || "";
}

function getDateValue(value) {
  if (value == null) return "";
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] || "";
}

function buildPortalListRequest(
  path,
  table,
  filters,
  sorts,
  rangeBounds,
  maxRows,
  columns,
  orExpression,
) {
  const params = new URLSearchParams();
  const handled = new Set();
  let handledOr = false;
  let handledSort = false;
  const find = (column, op) =>
    filters.find((filter) => filter.column === column && filter.op === op);

  const statusEq = find("status", "eq");
  const statusIn = find("status", "in");
  if (statusEq) {
    params.set("status", String(statusEq.value));
    handled.add("status");
  } else if (statusIn && Array.isArray(statusIn.value)) {
    params.set("statuses", statusIn.value.join(","));
    handled.add("status");
  }

  const orgEq = find("organization_id", "eq");
  const orgIn = find("organization_id", "in");
  if (orgEq) {
    params.set("organization_id", String(orgEq.value));
    handled.add("organization_id");
  } else if (orgIn && Array.isArray(orgIn.value)) {
    params.set("organization_ids", orgIn.value.join(","));
    handled.add("organization_id");
  }

  if (table === "datasets") {
    const createdGte = find("created_at", "gte") || find("created_at", "gt");
    const createdLte = find("created_at", "lte") || find("created_at", "lt");
    if (createdGte) {
      params.set("created_from", getDateValue(createdGte.value));
      handled.add("created_at");
    }
    if (createdLte) {
      const value = getDateValue(createdLte.value);
      if (value) {
        // Old page uses the first instant of the following day with `<` to make
        // its upper bound inclusive. Convert that to a date-based inclusive cap.
        const d = new Date(`${value}T00:00:00Z`);
        if (createdLte.op === "lt") d.setUTCDate(d.getUTCDate() - 1);
        params.set("created_to", d.toISOString().slice(0, 10));
        handled.add("created_at");
      }
    }
    if (
      filters.some(
        (filter) =>
          filter.column === "organizations.is_active" &&
          filter.op === "eq" &&
          filter.value === true,
      )
    ) {
      params.set("organization_active", "1");
      handled.add("organizations.is_active");
    }
    if (
      filters.some(
        (filter) =>
          filter.column === "published_at" &&
          filter.op === "not_is" &&
          filter.value === null,
      )
    ) {
      params.set("published_at_not_null", "1");
      handled.add("published_at");
    }
    const publishedBefore = find("published_at", "lte");
    if (publishedBefore) {
      params.set("published_before", String(publishedBefore.value));
      handled.add("published_at");
    }
    if (columns.includes("dataset_sdi_metadata("))
      params.set("include_sdi_metadata", "1");
  }

  if (orExpression) {
    const q = getLikeSearch(orExpression);
    if (q) {
      params.set("q", q);
      handledOr = true;
    }
  }
  if (sorts.length) {
    const sort = sorts[sorts.length - 1];
    const allowed =
      table === "datasets"
        ? { updated_at: "updated", title: "title", created_at: "created" }
        : { updated_at: "updated", title: "title" };
    if (allowed[sort.column]) {
      const key = allowed[sort.column];
      params.set(
        "sort",
        key === "updated"
          ? `updated_${sort.ascending ? "asc" : "desc"}`
          : key === "created"
            ? `created_${sort.ascending ? "asc" : "desc"}`
            : `title_${sort.ascending ? "asc" : "desc"}`,
      );
      handledSort = true;
    }
  }

  const offset = rangeBounds ? rangeBounds[0] : 0;
  const requestedLimit = rangeBounds
    ? rangeBounds[1] - rangeBounds[0] + 1
    : (maxRows ?? 100);
  const normalizedRequestedLimit = Math.max(0, Number(requestedLimit || 0));
  const limit = Math.min(500, Math.max(1, normalizedRequestedLimit || 1));
  params.set("limit", String(limit));
  if (offset > 0) params.set("offset", String(Math.min(100000, offset)));
  if (params.toString())
    path += `${path.includes("?") ? "&" : "?"}${params.toString()}`;

  return {
    path,
    handled,
    handledOr,
    handledSort,
    handledPaging: true,
    offset,
    requestedLimit: normalizedRequestedLimit,
  };
}

class Query {
  constructor(table, publicMode = false) {
    this.table = table;
    this.publicMode = publicMode;
    this.columns = "*";
    this.filters = [];
    this.sorts = [];
    this.maxRows = null;
    this.rangeBounds = null;
    this.mode = "select";
    this.payload = null;
    this.one = null;
    this.countMode = false;
    this.head = false;
  }
  select(columns = "*", options = {}) {
    this.columns = columns;
    this.countMode = options?.count === "exact";
    this.head = options?.head === true;
    return this;
  }
  eq(column, value) {
    this.filters.push({ column, op: "eq", value });
    return this;
  }
  neq(column, value) {
    this.filters.push({ column, op: "neq", value });
    return this;
  }
  gt(column, value) {
    this.filters.push({ column, op: "gt", value });
    return this;
  }
  gte(column, value) {
    this.filters.push({ column, op: "gte", value });
    return this;
  }
  lt(column, value) {
    this.filters.push({ column, op: "lt", value });
    return this;
  }
  lte(column, value) {
    this.filters.push({ column, op: "lte", value });
    return this;
  }
  is(column, value) {
    this.filters.push({ column, op: "is", value });
    return this;
  }
  in(column, values) {
    this.filters.push({ column, op: "in", value: values });
    return this;
  }
  match(values) {
    for (const [column, value] of Object.entries(values || {}))
      this.eq(column, value);
    return this;
  }
  not(column, operator, value) {
    this.filters.push({ column, op: `not_${operator}`, value });
    return this;
  }
  filter(column, operator, value) {
    this.filters.push({ column, op: operator, value });
    return this;
  }
  or(expression) {
    this.orExpression = expression;
    return this;
  }
  order(column, options = {}) {
    this.sorts.push({ column, ascending: options.ascending !== false });
    return this;
  }
  limit(value) {
    this.maxRows = Math.max(0, Number(value) || 0);
    return this;
  }
  range(from, to) {
    this.rangeBounds = [
      Math.max(0, Number(from) || 0),
      Math.max(0, Number(to) || 0),
    ];
    return this;
  }
  single() {
    this.one = "single";
    return this;
  }
  maybeSingle() {
    this.one = "maybe";
    return this;
  }
  insert(payload) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }
  update(payload) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }
  upsert(payload) {
    this.mode = "upsert";
    this.payload = payload;
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }

  async execute() {
    try {
      if (this.mode !== "select") return await this.executeMutation();
      let path;
      if (this.publicMode) {
        const slug = this.filters.find(
          (f) => f.column === "slug" && f.op === "eq",
        )?.value;
        const indicatorId = this.filters.find(
          (f) => f.column === "indicator_id" && f.op === "eq",
        )?.value;
        if (this.table === "indicators" && slug)
          path = `/api/v1/indicators/${encodeURIComponent(slug)}`;
        else if (this.table === "indicators") path = "/api/v1/indicators";
        else if (this.table === "indicator_observations" && indicatorId)
          path = `/api/v1/indicator-ids/${encodeURIComponent(indicatorId)}/observations`;
        else if (this.table === "datasets" && slug)
          path = `/api/v1/datasets/${encodeURIComponent(slug)}`;
        else if (this.table === "datasets") path = "/api/v1/datasets";
        else if (this.table === "public_catalog_revision")
          path = "/api/v1/public/revision";
        else path = null;
        if (!path)
          throw Object.assign(
            new Error(`Public backend read mapping missing for ${this.table}`),
            { code: "backend_mapping_missing" },
          );
      } else {
        path = readPath(this.table, this.filters);
        if (!path)
          throw Object.assign(
            new Error(`Backend read mapping missing for ${this.table}`),
            { code: "backend_mapping_missing" },
          );
      }
      let serverHandled = new Set();
      let serverHandledOr = false;
      let serverHandledSort = false;
      let serverHandledPaging = false;
      let listRequest = null;
      const listEndpoint =
        !this.publicMode &&
        ["datasets", "indicators"].includes(this.table) &&
        path === TABLE_PATHS[this.table];
      if (listEndpoint) {
        listRequest = buildPortalListRequest(
          path,
          this.table,
          this.filters,
          this.sorts,
          this.rangeBounds,
          this.maxRows,
          this.columns,
          this.orExpression,
        );
        path = listRequest.path;
        serverHandled = listRequest.handled;
        serverHandledOr = listRequest.handledOr;
        serverHandledSort = listRequest.handledSort;
        serverHandledPaging = listRequest.handledPaging;
      }
      let payload = await backendFetch(path, { auth: !this.publicMode });
      // The API deliberately caps a single response at 500 rows. Preserve the
      // old server-component contract for `.limit(1000)`/large ranges by
      // fetching bounded pages rather than silently returning half the data.
      if (
        listEndpoint &&
        listRequest &&
        listRequest.requestedLimit > 500 &&
        Array.isArray(payload?.data)
      ) {
        const aggregate = [...payload.data];
        const totalAvailable = Number(payload?.meta?.total ?? aggregate.length);
        let nextOffset = listRequest.offset + aggregate.length;
        while (
          aggregate.length < listRequest.requestedLimit &&
          aggregate.length < totalAvailable
        ) {
          const pageParams = new URLSearchParams(
            path.includes("?") ? path.split("?").slice(1).join("?") : "",
          );
          const nextLimit = Math.min(
            500,
            listRequest.requestedLimit - aggregate.length,
          );
          pageParams.set("limit", String(nextLimit));
          pageParams.set("offset", String(Math.min(100000, nextOffset)));
          const basePath = path.split("?")[0];
          const nextPayload = await backendFetch(
            `${basePath}?${pageParams.toString()}`,
            { auth: !this.publicMode },
          );
          const nextRows = Array.isArray(nextPayload?.data)
            ? nextPayload.data
            : [];
          if (nextRows.length === 0) break;
          aggregate.push(...nextRows);
          nextOffset += nextRows.length;
          if (nextRows.length < nextLimit) break;
        }
        payload = { ...payload, data: aggregate };
      }
      if (
        listEndpoint &&
        listRequest?.requestedLimit === 0 &&
        Array.isArray(payload?.data)
      )
        payload = { ...payload, data: [] };
      const datasetId = this.filters.find(
        (f) => f.column === "dataset_id" && f.op === "eq",
      )?.value;
      let rows = asArray(payload, this.table).map((item) =>
        normalizeRow(this.table, item, datasetId),
      );
      rows = rows.filter((row) =>
        this.filters.every((filter) => {
          if (serverHandled.has(filter.column)) return true;
          const actual = valueAt(row, filter.column);
          const wanted = filter.value;
          switch (filter.op) {
            case "eq":
              return String(actual ?? "") === String(wanted ?? "");
            case "neq":
              return String(actual ?? "") !== String(wanted ?? "");
            case "in":
              return (wanted || []).some((v) => String(v) === String(actual));
            case "gte":
              return actual != null && String(actual) >= String(wanted);
            case "lte":
              return actual != null && String(actual) <= String(wanted);
            case "gt":
              return actual != null && String(actual) > String(wanted);
            case "lt":
              return actual != null && String(actual) < String(wanted);
            case "is":
              return wanted === null
                ? actual == null
                : Boolean(actual) === Boolean(wanted);
            case "not_is":
              return wanted === null
                ? actual != null
                : Boolean(actual) !== Boolean(wanted);
            case "not_eq":
              return String(actual ?? "") !== String(wanted ?? "");
            default:
              return true;
          }
        }),
      );
      if (this.orExpression && !serverHandledOr)
        rows = rows.filter((row) => this.matchesOr(row, this.orExpression));
      if (!serverHandledSort) {
        for (const sort of [...this.sorts].reverse()) {
          rows.sort((a, b) => {
            const av = valueAt(a, sort.column);
            const bv = valueAt(b, sort.column);
            const order =
              av == null && bv == null
                ? 0
                : av == null
                  ? -1
                  : bv == null
                    ? 1
                    : String(av).localeCompare(String(bv), undefined, {
                        numeric: true,
                      });
            return sort.ascending ? order : -order;
          });
        }
      }
      const localCount = rows.length;
      const count =
        serverHandledPaging && Number.isFinite(Number(payload?.meta?.total))
          ? Number(payload.meta.total)
          : localCount;
      if (this.rangeBounds && !serverHandledPaging)
        rows = rows.slice(this.rangeBounds[0], this.rangeBounds[1] + 1);
      if (this.maxRows !== null && !serverHandledPaging)
        rows = rows.slice(0, this.maxRows);
      const data = this.one ? (rows[0] ?? null) : rows;
      if (this.one === "single" && rows.length !== 1)
        return {
          data: null,
          error: { code: "PGRST116", message: "Expected exactly one row" },
          count: this.countMode ? count : undefined,
        };
      return {
        data: this.head ? null : data,
        error: null,
        count: this.countMode ? count : undefined,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error?.message || "backend_unavailable",
          code: error?.code || "backend_unavailable",
          status: error?.status || null,
        },
        count: undefined,
      };
    }
  }

  matchesOr(row, expression) {
    const conditions = String(expression).split(",");
    return conditions.some((condition) => {
      const parts = condition.split(".");
      if (parts.length < 3) return true;
      const actual = valueAt(row, parts[0]);
      const op = parts[1];
      const raw = parts.slice(2).join(".");
      if (op === "is" && raw === "null") return actual == null;
      if (op === "not" && raw === "null") return actual != null;
      if (op === "ilike")
        return String(actual || "")
          .toLowerCase()
          .includes(raw.replace(/^%|%$/g, "").toLowerCase());
      if (op === "eq") return String(actual ?? "") === raw;
      if (op === "lte") return actual != null && String(actual) <= raw;
      if (op === "gte") return actual != null && String(actual) >= raw;
      return true;
    });
  }

  async executeMutation() {
    const payload = Array.isArray(this.payload)
      ? this.payload[0]
      : this.payload;
    let path = null;
    let method = "POST";
    let body = payload || {};
    const id = this.filters.find(
      (f) => f.column === "id" && f.op === "eq",
    )?.value;
    if (this.table === "organizations") {
      path = id
        ? `/api/v1/portal/organizations/${id}`
        : "/api/v1/portal/organizations";
      method = id ? "PATCH" : "POST";
    } else if (this.table === "organization_memberships") {
      path = id
        ? `/api/v1/portal/memberships/${id}`
        : "/api/v1/portal/memberships";
      method = id ? "PATCH" : "POST";
    } else if (this.table === "profiles") {
      path = "/api/v1/portal/profile";
      method = "PATCH";
    } else if (this.table === "indicators") {
      path = "/api/v1/portal/indicators";
      method = "POST";
    } else if (
      this.table === "indicator_observations" &&
      this.filters.find((f) => f.column === "indicator_id" && f.op === "eq")
        ?.value
    ) {
      path = `/api/v1/portal/indicators/${this.filters.find((f) => f.column === "indicator_id" && f.op === "eq").value}/observations`;
      method = "POST";
    } else if (this.table === "datasets") {
      path = id ? `/api/v1/portal/datasets/${id}` : "/api/v1/portal/datasets";
      method = id ? "PATCH" : "POST";
    } else
      throw Object.assign(
        new Error(`Backend mutation mapping missing for ${this.table}`),
        { code: "backend_mapping_missing" },
      );
    const response = await backendFetch(path, {
      method,
      body: JSON.stringify(body),
    });
    const data = response?.data ?? response;
    return {
      data: this.one === "single" ? data : Array.isArray(data) ? data : [data],
      error: null,
    };
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

function clientError(error) {
  return {
    data: null,
    error: {
      message: error?.message || "backend_unavailable",
      code: error?.code || "backend_unavailable",
      status: error?.status || null,
    },
  };
}

export const createBackendServerClient = cache(
  async function createBackendServerClient() {
    return {
      from(table) {
        return new Query(table);
      },
      async rpc(name, args = {}) {
        try {
          const id = args.p_dataset_id || args.p_indicator_id;
          let path;
          let method = "POST";
          let body = {};
          switch (name) {
            case "get_portal_shell_context":
              path = "/api/v1/portal/shell";
              method = "GET";
              break;
            case "get_portal_dashboard_summary":
              path = "/api/v1/portal/dashboard";
              method = "GET";
              break;
            case "get_sdi_quality_summary":
              path = "/api/v1/portal/data-quality/summary";
              method = "GET";
              break;
            case "complete_my_onboarding":
              path = "/api/v1/portal/onboarding";
              break;
            case "submit_dataset_for_review":
              path = `/api/v1/portal/datasets/${id}/workflow`;
              body = { action: "submit_for_review" };
              break;
            case "start_dataset_version":
              path = `/api/v1/portal/datasets/${id}/workflow`;
              body = {
                action: "start_version",
                change_summary: args.p_change_summary,
              };
              break;
            case "publish_dataset_after_validation":
              path = `/api/v1/portal/datasets/${id}/workflow`;
              body = { action: "publish" };
              break;
            case "submit_indicator_for_review":
              path = `/api/v1/portal/indicators/${id}/workflow`;
              body = { action: "submit_for_review" };
              break;
            case "publish_indicator":
              path = `/api/v1/portal/indicators/${id}/workflow`;
              body = { action: "publish" };
              break;
            case "return_indicator_for_changes":
              path = `/api/v1/portal/indicators/${id}/workflow`;
              body = {
                action: "return_for_changes",
                reason: args.p_reason || "",
              };
              break;
            case "archive_indicator":
              path = `/api/v1/portal/indicators/${id}/workflow`;
              body = { action: "archive" };
              break;
            case "publish_indicator_observation":
              path = `/api/v1/portal/indicators/${args.p_indicator_id}/observations/${encodeURIComponent(args.p_observation_id)}`;
              body = { action: "publish" };
              method = "PATCH";
              break;
            case "save_indicator":
              path = "/api/v1/portal/indicators";
              body = {
                id: args.p_indicator_id,
                code: args.p_code,
                slug: args.p_slug,
                title: args.p_title,
                definition: args.p_definition,
                unit: args.p_unit,
                organization_id: args.p_organization_id,
                source_name: args.p_source_name,
                period_label: args.p_period_label,
                value_numeric: args.p_value_numeric,
                value_text: args.p_value_text,
                reference_period_start: args.p_period_start,
                reference_period_end: args.p_period_end,
              };
              break;
            case "save_indicator_observation":
              path = `/api/v1/portal/indicators/${args.p_indicator_id}/observations`;
              body = {
                id: args.p_observation_id,
                period_start: args.p_period_start,
                period_end: args.p_period_end,
                period_label: args.p_period_label,
                geographic_code: args.p_geographic_code,
                geographic_name: args.p_geographic_name,
                dimension_key: args.p_dimension_key,
                value_numeric: args.p_value_numeric,
                value_text: args.p_value_text,
                unit: args.p_unit,
                source_name: args.p_source_name,
                source_url: args.p_source_url,
              };
              break;
            default:
              throw Object.assign(
                new Error(`Unsupported legacy RPC: ${name}`),
                { code: "backend_mapping_missing" },
              );
          }
          const payload = await backendFetch(path, {
            method,
            body: method === "GET" ? undefined : JSON.stringify(body),
          });
          const data =
            name === "get_portal_dashboard_summary"
              ? payload?.data?.summary
              : (payload?.data ?? payload);
          return { data, error: null };
        } catch (error) {
          return clientError(error);
        }
      },
      auth: {
        async getUser() {
          try {
            const payload = await backendFetch("/api/v1/auth/me");
            return { data: { user: payload?.data || null }, error: null };
          } catch (error) {
            return { data: { user: null }, error: clientError(error).error };
          }
        },
      },
    };
  },
);

export function createPublicBackendClient() {
  return {
    from(table) {
      return new Query(table, true);
    },
  };
}
