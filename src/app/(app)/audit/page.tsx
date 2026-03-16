"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

type AuditRow = {
  id: string;
  tenantId: string;
  actorUserId: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

function csvEscape(value: unknown) {
  const raw =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  return `"${String(raw).replace(/"/g, '""')}"`;
}

function pretty(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function resolveAuditHref(row: AuditRow) {
  const metadata = row.metadata || {};
  const childId =
    typeof metadata.childId === "string" ? metadata.childId : null;
  const threadId =
    typeof metadata.threadId === "string" ? metadata.threadId : null;
  const date =
    typeof metadata.date === "string" ? metadata.date.slice(0, 10) : null;

  switch (row.entityType) {
    case "child":
      return childId
        ? `/children?childId=${encodeURIComponent(childId)}`
        : `/children?childId=${encodeURIComponent(row.entityId)}`;
    case "childGuardian":
      return childId
        ? `/guardians?childId=${encodeURIComponent(childId)}`
        : "/guardians";
    case "attendance":
      if (childId && date) {
        return `/attendance?date=${encodeURIComponent(date)}&childId=${encodeURIComponent(childId)}`;
      }
      if (date) {
        return `/attendance?date=${encodeURIComponent(date)}`;
      }
      return "/attendance";
    case "message":
      return threadId
        ? `/messages?threadId=${encodeURIComponent(threadId)}`
        : "/messages";
    case "tenant":
      return "/settings?section=tenant";
    case "user":
      return "/settings?section=profile";
    default:
      return null;
  }
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function loadAudit() {
    try {
      setLoading(true);
      setError("");
      setPage(1);

      const res = await apiFetch("/admin/audit");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || `Audit fetch failed: ${res.status}`);
      }

      setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load audit log."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAudit();
  }, []);

  function resetFilters() {
    setPage(1);
    setQuery("");
    setActionFilter("ALL");
    setEntityFilter("ALL");
    setStartDate("");
    setEndDate("");
  }

  const actionOptions = useMemo(() => {
    return ["ALL", ...Array.from(new Set(rows.map((row) => row.action))).sort()];
  }, [rows]);

  const entityOptions = useMemo(() => {
    return ["ALL", ...Array.from(new Set(rows.map((row) => row.entityType))).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      if (actionFilter !== "ALL" && row.action !== actionFilter) return false;
      if (entityFilter !== "ALL" && row.entityType !== entityFilter) return false;

      const createdDay = row.createdAt.slice(0, 10);
      if (startDate && createdDay < startDate) return false;
      if (endDate && createdDay > endDate) return false;

      if (!q) return true;

      return [
        row.actorType,
        row.action,
        row.entityType,
        row.entityId,
        row.actorUserId,
        row.metadata ? JSON.stringify(row.metadata) : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query, actionFilter, entityFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const paged = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, totalPages]);

  function exportCsv() {
    const headers = [
      "createdAt",
      "actorType",
      "actorUserId",
      "action",
      "entityType",
      "entityId",
      "metadata",
    ];

    const body = filtered.map((row) =>
      [
        row.createdAt,
        row.actorType,
        row.actorUserId,
        row.action,
        row.entityType,
        row.entityId,
        row.metadata,
      ]
        .map(csvEscape)
        .join(",")
    );

    const csv = [headers.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `audit-log-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <RoleGate allow={["OWNER"]}>
      <div>
        <PageIntro
          title="Audit Log"
          description="Operational audit trail for BC licensing visits and compliance records."
        />

        <div className="mb-6 grid gap-3 lg:grid-cols-6">
          <input
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            placeholder="Search action, actor, entity, metadata..."
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none lg:col-span-2"
          />

          <select
            value={actionFilter}
            onChange={(e) => {
              setPage(1);
              setActionFilter(e.target.value);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none"
          >
            {actionOptions.map((value) => (
              <option key={value} value={value}>
                {value === "ALL" ? "All actions" : pretty(value)}
              </option>
            ))}
          </select>

          <select
            value={entityFilter}
            onChange={(e) => {
              setPage(1);
              setEntityFilter(e.target.value);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none"
          >
            {entityOptions.map((value) => (
              <option key={value} value={value}>
                {value === "ALL" ? "All entities" : pretty(value)}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPage(1);
              setStartDate(e.target.value);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPage(1);
              setEndDate(e.target.value);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none"
          />
        </div>

        <div className="mb-6 flex flex-wrap justify-end gap-3">
          <button
            onClick={resetFilters}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset filters
          </button>

          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Export CSV
          </button>

          <button
            onClick={loadAudit}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total records</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{rows.length}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Visible results</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{filtered.length}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle>Page</CardTitle></CardHeader>
            <CardContent><div className="text-sm text-slate-700">{page} / {totalPages}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle>Latest Event</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-slate-700">
                {filtered[0]?.createdAt ? new Date(filtered[0].createdAt).toLocaleString() : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Audit Events</CardTitle>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : filtered.length === 0 ? (
              <FilteredEmptyState
                totalCount={rows.length}
                filterLabel="filter"
                onClear={query || actionFilter !== "ALL" || entityFilter !== "ALL" || startDate || endDate ? resetFilters : undefined}
              />
            ) : (
              <>
                {/* ── Mobile card view ── */}
                <div className="space-y-3 md:hidden">
                  {paged.map((row) => {
                    const href = resolveAuditHref(row);
                    return (
                      <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {pretty(row.action)}
                          </span>
                          <span className="text-xs text-slate-500 shrink-0">
                            {new Date(row.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">{pretty(row.actorType)}</span>
                          <span className="font-medium text-slate-700">{pretty(row.entityType)}</span>
                          {href ? (
                            <Link href={href} className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700 truncate max-w-[200px]">
                              {row.entityId}
                            </Link>
                          ) : (
                            <span className="truncate max-w-[200px]">{row.entityId}</span>
                          )}
                        </div>
                        {row.metadata ? (
                          <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                            {JSON.stringify(row.metadata, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* ── Desktop table ── */}
                <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">Actor</th>
                        <th className="px-4 py-3 font-medium">Action</th>
                        <th className="px-4 py-3 font-medium">Entity</th>
                        <th className="px-4 py-3 font-medium">Metadata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((row) => {
                        const href = resolveAuditHref(row);
                        return (
                          <tr key={row.id} className="border-t border-slate-200 align-top">
                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                              {new Date(row.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{pretty(row.actorType)}</div>
                              <div className="mt-1 text-xs text-slate-500">{row.actorUserId}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                                {pretty(row.action)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{pretty(row.entityType)}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                {href ? (
                                  <Link href={href} className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700">
                                    {row.entityId}
                                  </Link>
                                ) : (
                                  row.entityId
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <pre className="max-w-xl whitespace-pre-wrap break-words text-xs text-slate-600">
                                {row.metadata ? JSON.stringify(row.metadata, null, 2) : "—"}
                              </pre>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
