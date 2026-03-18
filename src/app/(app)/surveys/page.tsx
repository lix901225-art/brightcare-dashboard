"use client";

import { useEffect, useState } from "react";
import { BarChart3, Check, ClipboardList, Eye, Plus, Star, Trash2, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

type Question = {
  id: string;
  text: string;
  type: "rating" | "text" | "choice";
  options?: string[];
};

type Template = {
  id: string;
  title: string;
  description?: string | null;
  questions: Question[];
  isActive: boolean;
  createdAt: string;
  _count?: { responses: number };
};

type Summary = {
  templateId: string;
  title: string;
  totalResponses: number;
  averageRating: number | null;
  ratingDistribution: Record<string, number>;
  feedbackCount: number;
};

export default function SurveysPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewSummary, setViewSummary] = useState<Summary | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { id: "q1", text: "How satisfied are you with our childcare services overall?", type: "rating" },
    { id: "q2", text: "How would you rate the communication from staff?", type: "rating" },
    { id: "q3", text: "How satisfied are you with the learning activities?", type: "rating" },
    { id: "q4", text: "What do you like most about our centre?", type: "text" },
    { id: "q5", text: "What could we improve?", type: "text" },
  ]);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await apiFetch("/surveys/templates");
      if (res.ok) setTemplates(await res.json());
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load surveys."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createSurvey() {
    try {
      setSaving(true);
      setError("");
      if (!title.trim()) throw new Error("Title is required.");
      const res = await apiFetch("/surveys/templates", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          questions,
        }),
      });
      if (!res.ok) throw new Error("Failed to create survey.");
      setOk("Survey created.");
      setShowCreate(false);
      setTitle("");
      setDescription("");
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to create survey."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await apiFetch(`/surveys/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !isActive }),
    });
    await load();
  }

  async function deleteSurvey(id: string, title: string) {
    if (!confirm(`Delete survey "${title}"?`)) return;
    await apiFetch(`/surveys/templates/${id}`, { method: "DELETE" });
    setOk("Survey deleted.");
    await load();
  }

  async function showResults(id: string) {
    const res = await apiFetch(`/surveys/templates/${id}/summary`);
    if (res.ok) setViewSummary(await res.json());
  }

  function addQuestion() {
    const id = `q${Date.now()}`;
    setQuestions((prev) => [...prev, { id, text: "", type: "rating" }]);
  }

  function updateQuestion(idx: number, updates: Partial<Question>) {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...updates } : q)));
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Parent surveys"
            description="Create satisfaction surveys and view parent feedback."
          />
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> New survey
          </button>
        </div>

        {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {/* Summary modal */}
        {viewSummary && (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-violet-500" />
                  Results: {viewSummary.title}
                </CardTitle>
                <button onClick={() => setViewSummary(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-3xl font-bold text-slate-900">{viewSummary.totalResponses}</div>
                  <div className="mt-1 text-xs text-slate-500">Total responses</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-3xl font-bold text-slate-900">{viewSummary.averageRating ?? "—"}</div>
                  <div className="mt-1 text-xs text-slate-500">Avg rating</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-3xl font-bold text-slate-900">{viewSummary.feedbackCount}</div>
                  <div className="mt-1 text-xs text-slate-500">Written feedback</div>
                </div>
              </div>
              {Object.keys(viewSummary.ratingDistribution).length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Rating distribution</div>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const count = viewSummary.ratingDistribution[n] || 0;
                      const pct = viewSummary.totalResponses > 0 ? Math.round((count / viewSummary.totalResponses) * 100) : 0;
                      return (
                        <div key={n} className="flex items-center gap-3">
                          <div className="flex w-12 items-center gap-1 text-sm text-slate-600">
                            {n} <Star className="h-3 w-3 text-amber-400" />
                          </div>
                          <div className="h-3 flex-1 rounded-full bg-slate-100">
                            <div className="h-3 rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="w-12 text-right text-xs text-slate-500">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create form */}
        {showCreate && (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create survey</CardTitle>
                <button onClick={() => setShowCreate(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Survey title *</div>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Spring 2026 Parent Satisfaction Survey" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Description</div>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description shown to parents..." rows={2} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none" />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Questions</div>
                  <div className="space-y-3">
                    {questions.map((q, i) => (
                      <div key={q.id} className="flex gap-2">
                        <input
                          value={q.text}
                          onChange={(e) => updateQuestion(i, { text: e.target.value })}
                          placeholder={`Question ${i + 1}`}
                          className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
                        />
                        <select value={q.type} onChange={(e) => updateQuestion(i, { type: e.target.value as any })} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs">
                          <option value="rating">Rating (1-5)</option>
                          <option value="text">Text</option>
                          <option value="choice">Choice</option>
                        </select>
                        <button onClick={() => removeQuestion(i)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={addQuestion} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                    <Plus className="h-3 w-3" /> Add question
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={createSurvey} disabled={saving || !title.trim()} className="inline-flex h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                    {saving ? "Creating..." : "Create survey"}
                  </button>
                  <button onClick={() => setShowCreate(false)} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Survey list */}
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading surveys...</div>
        ) : templates.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-8 text-center">
              <ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <div className="text-sm text-slate-500">
                No surveys yet.{" "}
                <button onClick={() => setShowCreate(true)} className="font-medium text-slate-700 hover:text-slate-900">
                  Create your first survey &rarr;
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <Card key={t.id} className="rounded-2xl border-0 shadow-sm">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{t.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${t.isActive ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-slate-100 text-slate-500"}`}>
                          {t.isActive ? "Active" : "Closed"}
                        </span>
                      </div>
                      {t.description && <div className="mt-1 text-sm text-slate-500">{t.description}</div>}
                      <div className="mt-2 flex gap-3 text-xs text-slate-400">
                        <span>{(t.questions as Question[]).length} questions</span>
                        <span>{t._count?.responses ?? 0} responses</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => showResults(t.id)} title="View results" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50">
                        <Eye className="h-3.5 w-3.5" /> Results
                      </button>
                      <button onClick={() => toggleActive(t.id, t.isActive)} className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium ${t.isActive ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
                        {t.isActive ? "Close" : "Reopen"}
                      </button>
                      <button onClick={() => deleteSurvey(t.id, t.title)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
