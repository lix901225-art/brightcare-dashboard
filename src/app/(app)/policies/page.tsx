"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X, FileCheck, ChevronDown, ChevronUp, Check } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

type Policy = {
  id: string;
  title: string;
  content?: string | null;
  version: string;
  createdAt: string;
};

type PolicyAck = {
  id: string;
  policyId: string;
  userId: string;
  ackedAt: string;
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formVersion, setFormVersion] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acks, setAcks] = useState<Record<string, PolicyAck[]>>({});
  const [acksLoading, setAcksLoading] = useState<string | null>(null);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const res = await apiFetch("/policies");
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || `Policies failed: ${res.status}`);
      setPolicies(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load policies."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredPolicies = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return policies;
    return policies.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.content || "").toLowerCase().includes(q) ||
        p.version.toLowerCase().includes(q)
    );
  }, [policies, query]);

  function resetForm() {
    setFormTitle("");
    setFormContent("");
    setFormVersion("");
  }

  async function createPolicy() {
    try {
      setSaving(true);
      setError("");
      setOk("");

      if (!formTitle.trim()) throw new Error("Policy title is required.");
      if (!formContent.trim()) throw new Error("Policy content is required.");

      const body: Record<string, string> = {
        title: formTitle.trim(),
        content: formContent.trim(),
      };
      if (formVersion.trim()) body.version = formVersion.trim();

      const res = await apiFetch("/policies", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Create failed: ${res.status}`);

      setOk(`Policy "${formTitle.trim()}" created.`);
      setShowCreate(false);
      resetForm();
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to create policy."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleExpand(policyId: string) {
    if (expandedId === policyId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(policyId);

    if (!acks[policyId]) {
      try {
        setAcksLoading(policyId);
        const res = await apiFetch(`/policies/${policyId}/acks`);
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setAcks((prev) => ({ ...prev, [policyId]: data }));
        }
      } catch {
        // silently fail
      } finally {
        setAcksLoading(null);
      }
    }
  }

  async function acknowledgePolicy(policyId: string) {
    try {
      setError("");
      setOk("");

      const res = await apiFetch(`/policies/${policyId}/ack`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Acknowledge failed: ${res.status}`);

      setOk("Policy acknowledged.");

      // Reload acks for this policy
      const acksRes = await apiFetch(`/policies/${policyId}/acks`);
      const acksData = await acksRes.json();
      if (acksRes.ok && Array.isArray(acksData)) {
        setAcks((prev) => ({ ...prev, [policyId]: acksData }));
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to acknowledge policy."));
    }
  }

  return (
    <RoleGate allow={["OWNER", "STAFF", "PARENT"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Policies"
            description="Manage daycare policies and track parent acknowledgements."
          />
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New policy
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

        {showCreate ? (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create new policy</CardTitle>
                <button
                  onClick={() => { setShowCreate(false); resetForm(); }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Title</div>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="e.g. Health & Safety Policy"
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Version (optional)</div>
                  <input
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Content</div>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none resize-y"
                  placeholder="Full policy text..."
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={createPolicy}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create policy"}
                </button>
                <button
                  onClick={() => { setShowCreate(false); resetForm(); }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle>Total policies</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-semibold">{policies.length}</div></CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle>Latest version</CardTitle></CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-slate-700">
                {policies.length > 0 ? policies[0]?.version || "—" : "—"}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle>Acknowledgements</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-slate-500">
                Expand a policy below to view acknowledgement details.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search policies..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Loading policies...
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            {policies.length === 0 ? "No policies yet. Create your first policy above." : "No policies match your search."}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPolicies.map((policy) => {
              const isExpanded = expandedId === policy.id;
              const policyAcks = acks[policy.id] || [];

              return (
                <Card key={policy.id} className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <button
                      onClick={() => toggleExpand(policy.id)}
                      className="flex w-full items-start justify-between gap-3 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <FileCheck className="mt-0.5 h-5 w-5 text-slate-400" />
                        <div>
                          <div className="font-semibold text-slate-900">{policy.title}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium">
                              {policy.version}
                            </span>
                            <span>{new Date(policy.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </button>
                  </CardHeader>

                  {isExpanded ? (
                    <CardContent>
                      {policy.content ? (
                        <div className="mb-4 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                          {policy.content}
                        </div>
                      ) : null}

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => acknowledgePolicy(policy.id)}
                          className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
                        >
                          <Check className="h-4 w-4" />
                          Acknowledge
                        </button>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                          Acknowledgements ({policyAcks.length})
                        </div>
                        {acksLoading === policy.id ? (
                          <div className="text-sm text-slate-500">Loading...</div>
                        ) : policyAcks.length === 0 ? (
                          <div className="text-sm text-slate-500">No acknowledgements yet.</div>
                        ) : (
                          <div className="space-y-1">
                            {policyAcks.map((ack) => (
                              <div
                                key={ack.id}
                                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                              >
                                <span className="text-slate-700">User {ack.userId.slice(0, 8)}...</span>
                                <span className="text-xs text-slate-500">
                                  {new Date(ack.ackedAt).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
