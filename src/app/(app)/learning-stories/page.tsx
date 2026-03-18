"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Plus, Search } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/error";

type Story = {
  id: string;
  childId: string;
  childName?: string | null;
  title: string;
  observation: string;
  learningOutcome?: string | null;
  nextSteps?: string | null;
  developmentArea?: string | null;
  photoUrls?: string[];
  authorName?: string | null;
  createdAt: string;
};

type Child = { id: string; fullName?: string | null };

const DEV_AREAS = ["Physical / Motor", "Cognitive", "Language / Communication", "Social / Emotional", "Creative / Artistic", "Self-care"] as const;

export default function LearningStoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");
  const [childFilter, setChildFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [childId, setChildId] = useState("");
  const [title, setTitle] = useState("");
  const [observation, setObservation] = useState("");
  const [learningOutcome, setLearningOutcome] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [devArea, setDevArea] = useState("");

  async function loadAll() {
    try {
      setLoading(true);
      const [storiesRes, childrenRes] = await Promise.all([
        apiFetch("/learning-stories"),
        apiFetch("/children"),
      ]);
      if (storiesRes.ok) setStories(await storiesRes.json());
      if (childrenRes.ok) setChildren(await childrenRes.json());
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load learning stories."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function create() {
    try {
      setSaving(true);
      setError("");
      setOk("");
      if (!childId) throw new Error("Select a child.");
      if (!title.trim()) throw new Error("Title is required.");
      if (!observation.trim()) throw new Error("Observation is required.");

      const res = await apiFetch("/learning-stories", {
        method: "POST",
        body: JSON.stringify({
          childId,
          title: title.trim(),
          observation: observation.trim(),
          learningOutcome: learningOutcome.trim() || undefined,
          nextSteps: nextSteps.trim() || undefined,
          developmentArea: devArea || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Create failed: ${res.status}`);

      setOk("Learning story published!");
      setShowCreate(false);
      setTitle("");
      setObservation("");
      setLearningOutcome("");
      setNextSteps("");
      setDevArea("");
      await loadAll();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to create learning story."));
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    let result = stories;
    if (childFilter) result = result.filter((s) => s.childId === childFilter);
    const q = query.trim().toLowerCase();
    if (q) result = result.filter((s) =>
      [s.title, s.childName, s.observation, s.developmentArea].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
    return result;
  }, [stories, query, childFilter]);

  return (
    <RoleGate allow={["OWNER", "STAFF", "PARENT"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Learning Stories"
            description="Document children's learning journeys through observations, outcomes, and next steps."
          />
          <button onClick={() => setShowCreate(!showCreate)} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" /> New story
          </button>
        </div>

        {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {showCreate && (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle>New learning story</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Child</div>
                  <select value={childId} onChange={(e) => setChildId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                    <option value="">Select child...</option>
                    {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Title</div>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="e.g. First time building a tower" />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Development area</div>
                  <select value={devArea} onChange={(e) => setDevArea(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                    <option value="">Select area...</option>
                    {DEV_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Observation (what happened)</div>
                <textarea value={observation} onChange={(e) => setObservation(e.target.value)} className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Describe what you observed the child doing..." />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Learning outcome</div>
                  <textarea value={learningOutcome} onChange={(e) => setLearningOutcome(e.target.value)} className="min-h-16 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="What did the child learn or demonstrate?" />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Next steps</div>
                  <textarea value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} className="min-h-16 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="How can we build on this learning?" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={create} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                  {saving ? "Publishing..." : "Publish story"}
                </button>
                <button onClick={() => setShowCreate(false)} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stories..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none" />
          </div>
          <select value={childFilter} onChange={(e) => setChildFilter(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
            <option value="">All children</option>
            {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        </div>

        {loading ? (
          <CardListSkeleton count={3} />
        ) : filtered.length === 0 ? (
          <FilteredEmptyState totalCount={stories.length} filterLabel="search" />
        ) : (
          <div className="space-y-4">
            {filtered.map((story) => (
              <Card key={story.id} className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                      <BookOpen className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{story.title}</h3>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{story.childName || "Child"}</span>
                            {story.developmentArea && (
                              <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{story.developmentArea}</span>
                            )}
                            <span>{new Date(story.createdAt).toLocaleDateString()}</span>
                            {story.authorName && <span>by {story.authorName}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-sm leading-relaxed text-slate-700">{story.observation}</div>
                      {story.learningOutcome && (
                        <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                          <strong>Learning outcome:</strong> {story.learningOutcome}
                        </div>
                      )}
                      {story.nextSteps && (
                        <div className="mt-1 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                          <strong>Next steps:</strong> {story.nextSteps}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
