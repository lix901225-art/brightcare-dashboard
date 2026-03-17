"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  FileText,
  Filter,
  FolderOpen,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/api-helpers";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

/* ─── types ─── */

type Child = { id: string; fullName?: string | null };
type Room = { id: string; name?: string | null };

type Document = {
  id: string;
  title: string;
  category: string;
  childId?: string | null;
  staffUserId?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
  uploadedBy?: string | null;
  createdAt?: string | null;
  childName?: string;
};

const CATEGORIES = [
  "Medical",
  "Immunization",
  "Allergy Plan",
  "Enrolment",
  "Legal / Custody",
  "Photo ID",
  "BC Licensing",
  "ECE Certification",
  "Inspection Report",
  "Insurance",
  "Consent Form",
  "Other",
] as const;

/* BC-specific category descriptions for compliance guidance */
const CATEGORY_HELP: Record<string, string> = {
  Medical: "Medical forms compliant with Fraser Health / Vancouver Coastal Health requirements",
  Immunization: "Immunization records per BC Community Care and Assisted Living Act guidelines",
  "Allergy Plan": "Individualized allergy management plans required by BC licensing",
  "BC Licensing": "Documents for BC Community Care facility licensing inspections",
  "ECE Certification": "Early Childhood Educator certificates, expiry tracking for staff",
  "Inspection Report": "Fraser Health / Interior Health / Island Health inspection records",
  "Consent Form": "Photo, field trip, medication administration consent forms",
};

/* ─── page ─── */

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [childFilter, setChildFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState<"all" | "expiring" | "expired">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [backendReady, setBackendReady] = useState(true);

  /* form state */
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [childId, setChildId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [docsRes, childrenRes] = await Promise.all([
        apiFetch("/documents").catch(() => null),
        apiFetch("/children"),
      ]);

      /* backend may not have /documents yet */
      if (!docsRes || !docsRes.ok) {
        if (!docsRes || docsRes.status === 404) {
          setBackendReady(false);
          setDocuments([]);
        } else {
          const d = await docsRes.json();
          throw new Error(d?.message || `Documents load failed: ${docsRes.status}`);
        }
      } else {
        setBackendReady(true);
        const docsData = await docsRes.json();
        const childrenData = childrenRes.ok ? await childrenRes.json() : [];
        const childRows: Child[] = Array.isArray(childrenData) ? childrenData : [];
        const childById = Object.fromEntries(
          childRows.map((c) => [c.id, c.fullName || c.id])
        );
        const docRows: Document[] = (Array.isArray(docsData) ? docsData : []).map(
          (doc: Document) => ({
            ...doc,
            childName: doc.childId ? childById[doc.childId] || doc.childId : undefined,
          })
        );
        setDocuments(docRows);
        setChildren(childRows);
        return;
      }

      /* still load children even if docs 404 */
      const childrenData = childrenRes.ok ? await childrenRes.json() : [];
      setChildren(Array.isArray(childrenData) ? childrenData : []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load documents."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  /* computed: expiry helpers */
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysOut = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();

  const filtered = useMemo(() => {
    let result = documents;

    if (categoryFilter) {
      result = result.filter((d) => d.category === categoryFilter);
    }
    if (childFilter) {
      result = result.filter((d) => d.childId === childFilter);
    }
    if (expiryFilter === "expired") {
      result = result.filter((d) => d.expiresAt && d.expiresAt.slice(0, 10) < today);
    } else if (expiryFilter === "expiring") {
      result = result.filter(
        (d) =>
          d.expiresAt &&
          d.expiresAt.slice(0, 10) >= today &&
          d.expiresAt.slice(0, 10) <= thirtyDaysOut
      );
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;
    return result.filter((d) =>
      [d.title, d.category, d.childName, d.notes, d.fileName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [documents, query, categoryFilter, childFilter, expiryFilter, today, thirtyDaysOut]);

  const stats = useMemo(() => {
    const expired = documents.filter(
      (d) => d.expiresAt && d.expiresAt.slice(0, 10) < today
    ).length;
    const expiringSoon = documents.filter(
      (d) =>
        d.expiresAt &&
        d.expiresAt.slice(0, 10) >= today &&
        d.expiresAt.slice(0, 10) <= thirtyDaysOut
    ).length;
    return { total: documents.length, expired, expiringSoon };
  }, [documents, today, thirtyDaysOut]);

  function resetForm() {
    setTitle("");
    setCategory(CATEGORIES[0]);
    setChildId("");
    setExpiresAt("");
    setNotes("");
    setFile(null);
  }

  async function createDocument() {
    try {
      setSaving(true);
      setError("");
      setOk("");

      if (!title.trim()) throw new Error("Title is required.");

      /* If backend supports file upload, use FormData; otherwise JSON */
      if (file) {
        const fd = new FormData();
        fd.append("title", title.trim());
        fd.append("category", category);
        if (childId) fd.append("childId", childId);
        if (expiresAt) fd.append("expiresAt", new Date(expiresAt).toISOString());
        if (notes.trim()) fd.append("notes", notes.trim());
        fd.append("file", file);

        const res = await apiFetch("/documents", {
          method: "POST",
          body: fd,
          headers: {}, /* let browser set multipart boundary */
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || `Upload failed: ${res.status}`);
      } else {
        const res = await apiFetch("/documents", {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            category,
            childId: childId || undefined,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
            notes: notes.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || `Create failed: ${res.status}`);
      }

      setOk("Document saved.");
      setShowCreate(false);
      resetForm();
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to save document."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteDocument(docId: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    try {
      setSaving(true);
      setError("");
      setOk("");
      const res = await apiFetch(`/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || `Delete failed: ${res.status}`);
      }
      setOk("Document deleted.");
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to delete document."));
    } finally {
      setSaving(false);
    }
  }

  function expiryBadge(expiresAt: string | null | undefined) {
    if (!expiresAt) return null;
    const d = expiresAt.slice(0, 10);
    if (d < today) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </span>
      );
    }
    if (d <= thirtyDaysOut) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          <Calendar className="h-3 w-3" />
          Expiring soon
        </span>
      );
    }
    return null;
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Documents"
            description="Upload and manage documents for children and staff. Track expiry dates for BC licensing compliance."
          />
          <button
            onClick={() => setShowCreate(true)}
            disabled={!backendReady}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add document
          </button>
        </div>

        {ok ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {ok}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {!backendReady ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <FolderOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <div className="text-lg font-semibold text-slate-700">
                Document management coming soon
              </div>
              <div className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                The backend API for document management is being prepared. Once the{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">/documents</code>{" "}
                endpoint is available, you&apos;ll be able to upload, track, and manage documents
                for BC licensing compliance here.
              </div>
              <div className="mx-auto mt-4 max-w-sm rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700">
                <strong>BC Compliance:</strong> Immunization records, medical forms, ECE
                certifications, and inspection reports will all be trackable with expiry alerts.
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Create form */}
            {showCreate ? (
              <Card className="mb-6 rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Add document</CardTitle>
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        resetForm();
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Title <span className="text-rose-500">*</span>
                      </div>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Immunization record — Emma S."
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Category
                      </div>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {CATEGORY_HELP[category] ? (
                        <div className="mt-1 text-[10px] text-slate-400">
                          {CATEGORY_HELP[category]}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Child (optional)
                      </div>
                      <select
                        value={childId}
                        onChange={(e) => setChildId(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      >
                        <option value="">Not child-specific</option>
                        {children.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.fullName || c.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Expiry date (optional)
                      </div>
                      <input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      />
                      <div className="mt-1 text-[10px] text-slate-400">
                        You&apos;ll receive alerts 30 days before expiry — critical for ECE certs
                        and immunization records.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      File (optional)
                    </div>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 hover:border-slate-300">
                      <Upload className="h-5 w-5 text-slate-400" />
                      <div className="text-sm text-slate-600">
                        {file ? (
                          <span className="font-medium">{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                        ) : (
                          "Click to upload a file (PDF, image, or document)"
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Notes
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional context, source, or compliance notes..."
                      maxLength={1000}
                      className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
                    />
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={createDocument}
                      disabled={saving || !title.trim()}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save document"}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        resetForm();
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Stats */}
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Total documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card className={`rounded-2xl border-0 shadow-sm ${stats.expiringSoon > 0 ? "ring-1 ring-amber-200" : ""}`}>
                <CardHeader className="pb-2">
                  <CardTitle className={stats.expiringSoon > 0 ? "text-sm text-amber-600" : "text-sm text-slate-500"}>
                    Expiring within 30 days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-semibold ${stats.expiringSoon > 0 ? "text-amber-700" : ""}`}>
                    {stats.expiringSoon}
                  </div>
                </CardContent>
              </Card>
              <Card className={`rounded-2xl border-0 shadow-sm ${stats.expired > 0 ? "ring-1 ring-rose-200" : ""}`}>
                <CardHeader className="pb-2">
                  <CardTitle className={stats.expired > 0 ? "text-sm text-rose-600" : "text-sm text-slate-500"}>
                    Expired
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-semibold ${stats.expired > 0 ? "text-rose-700" : ""}`}>
                    {stats.expired}
                  </div>
                  {stats.expired > 0 ? (
                    <div className="mt-1 text-xs text-rose-600">
                      Action required for BC licensing compliance
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={childFilter}
                  onChange={(e) => setChildFilter(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                >
                  <option value="">All children</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.id}
                    </option>
                  ))}
                </select>
                <select
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value as "all" | "expiring" | "expired")}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="expiring">Expiring soon</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Document list */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Document library</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <CardListSkeleton count={4} />
                ) : filtered.length === 0 ? (
                  <FilteredEmptyState
                    totalCount={documents.length}
                    filterLabel="search or filter"
                  />
                ) : (
                  <div className="space-y-3">
                    {filtered.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-start md:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="font-medium text-slate-900">
                              {doc.title}
                            </span>
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              {doc.category}
                            </span>
                            {expiryBadge(doc.expiresAt)}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {doc.childName ? (
                              <span>Child: {doc.childName}</span>
                            ) : null}
                            {doc.expiresAt ? (
                              <span>Expires: {formatDate(doc.expiresAt)}</span>
                            ) : null}
                            {doc.createdAt ? (
                              <span>Uploaded: {formatDate(doc.createdAt)}</span>
                            ) : null}
                            {doc.fileName ? (
                              <span>{doc.fileName}</span>
                            ) : null}
                          </div>
                          {doc.notes ? (
                            <div className="mt-2 text-sm text-slate-600">
                              {doc.notes}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          {doc.fileUrl ? (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <FolderOpen className="h-3.5 w-3.5" />
                              View
                            </a>
                          ) : null}
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            disabled={saving}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RoleGate>
  );
}
