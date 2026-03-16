"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X, FileCheck, ChevronDown, ChevronUp, Check } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { readSession } from "@/lib/session";
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
  const session = readSession();
  const isParent = session?.role === "PARENT";

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
      const policyList = Array.isArray(data) ? data : [];
      setPolicies(policyList);

      // For parents, preload ack status for all policies so collapsed view shows ✓
      if (isParent && policyList.length > 0) {
        const ackResults = await Promise.allSettled(
          policyList.map((p: Policy) => apiFetch(`/policies/${p.id}/acks`).then((r) => r.json()))
        );
        const newAcks: Record<string, PolicyAck[]> = {};
        policyList.forEach((p: Policy, i: number) => {
          const result = ackResults[i];
          if (result.status === "fulfilled" && Array.isArray(result.value)) {
            newAcks[p.id] = result.value;
          }
        });
        setAcks((prev) => ({ ...prev, ...newAcks }));
      }
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
        {isParent ? (
          <div className="mb-4">
            <Link href="/parent" className="text-sm text-slate-500 hover:text-slate-700">
              &larr; Back to parent home
            </Link>
          </div>
        ) : null}

        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Policies"
            description={isParent
              ? "Review and acknowledge your centre\u2019s policies."
              : "Manage daycare policies and track parent acknowledgements."
            }
          />
          {!isParent ? (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New policy
            </button>
          ) : null}
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

        {showCreate && !isParent ? (
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

        {isParent ? (
          <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
            <p className="text-sm text-sky-800">
              Please review the policies below and acknowledge each one. Tap a policy to read it and confirm.
            </p>
            {policies.length > 0 ? (() => {
              const acked = policies.filter((p) => (acks[p.id] || []).some((a) => a.userId === session?.userId)).length;
              const total = policies.length;
              return (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-sky-700">{acked} of {total} acknowledged</span>
                    {acked === total ? <span className="font-semibold text-emerald-700">All done ✓</span> : null}
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-sky-100">
                    <div
                      className={`h-full rounded-full transition-all ${acked === total ? "bg-emerald-500" : "bg-sky-500"}`}
                      style={{ width: `${total > 0 ? Math.round((acked / total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })() : null}
          </div>
        ) : (
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
        )}

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
            {policies.length === 0
              ? (isParent ? "No policies posted by your centre yet." : "No policies yet. Create your first policy above.")
              : "No policies match your search."}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPolicies.map((policy) => {
              const isExpanded = expandedId === policy.id;
              const policyAcks = acks[policy.id] || [];
              const myAck = isParent ? policyAcks.find((a) => a.userId === session?.userId) : null;

              return (
                <Card key={policy.id} className={[
                  "rounded-2xl border-0 shadow-sm",
                  isParent && myAck ? "ring-1 ring-emerald-200" : "",
                  isParent && !myAck && policyAcks.length > 0 ? "" : "",
                ].join(" ")}>
                  <CardHeader>
                    <button
                      onClick={() => toggleExpand(policy.id)}
                      className="flex w-full items-start justify-between gap-3 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <FileCheck className={[
                          "mt-0.5 h-5 w-5",
                          isParent && myAck ? "text-emerald-500" : "text-slate-400",
                        ].join(" ")} />
                        <div>
                          <div className="font-semibold text-slate-900">{policy.title}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium">
                              {policy.version}
                            </span>
                            <span>{new Date(policy.createdAt).toLocaleDateString()}</span>
                            {isParent && myAck ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                                <Check className="h-3 w-3" /> Acknowledged
                              </span>
                            ) : isParent ? (
                              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                                Needs review
                              </span>
                            ) : null}
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

                      {!(isParent && myAck) ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => acknowledgePolicy(policy.id)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
                          >
                            <Check className="h-4 w-4" />
                            {isParent ? "I have read and acknowledge this policy" : "Acknowledge"}
                          </button>
                        </div>
                      ) : null}

                      <div className="mt-4">
                        {isParent ? (
                          /* Parents only see their own acknowledgement status */
                          policyAcks.some((a) => a.userId === session?.userId) ? (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                              ✓ You acknowledged this policy on{" "}
                              {new Date(
                                policyAcks.find((a) => a.userId === session?.userId)!.ackedAt
                              ).toLocaleDateString()}
                            </div>
                          ) : null
                        ) : (
                          /* Owner/staff see full ack list */
                          <>
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
                          </>
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
