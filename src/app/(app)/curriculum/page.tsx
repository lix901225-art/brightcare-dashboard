"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Edit2, Megaphone, Plus, Trash2, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

type Activity = { name: string; description?: string; developmentArea?: string; duration?: string };
type LessonPlan = {
  id: string;
  title: string;
  date: string;
  ageGroup?: string | null;
  activities?: Activity[] | null;
  learningGoals?: string | null;
  materials?: string | null;
  notes?: string | null;
  createdAt: string;
};

const AGE_GROUPS = [
  { value: "infant", label: "Infant (0-18mo)" },
  { value: "toddler", label: "Toddler (18mo-3yr)" },
  { value: "preschool", label: "Preschool (3-5yr)" },
  { value: "school-age", label: "School-age (5+)" },
];

const DEV_AREAS = [
  "Physical/Motor",
  "Language/Communication",
  "Social/Emotional",
  "Cognitive",
  "Creative",
];

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const emptyForm = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  ageGroup: "",
  learningGoals: "",
  materials: "",
  notes: "",
};

export default function CurriculumPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch(`/lesson-plans?weekStart=${weekStart.toISOString().slice(0, 10)}`);
      if (res.ok) setPlans(await res.json());
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [weekStart]);

  function openCreate() {
    setForm({ ...emptyForm, date: weekStart.toISOString().slice(0, 10) });
    setActivities([{ name: "", description: "", developmentArea: "", duration: "" }]);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(p: LessonPlan) {
    setForm({
      title: p.title,
      date: new Date(p.date).toISOString().slice(0, 10),
      ageGroup: p.ageGroup || "",
      learningGoals: p.learningGoals || "",
      materials: p.materials || "",
      notes: p.notes || "",
    });
    setActivities(Array.isArray(p.activities) ? p.activities : []);
    setEditingId(p.id);
    setShowForm(true);
  }

  async function save() {
    try {
      setSaving(true);
      setError("");
      if (!form.title.trim()) throw new Error("Title required.");
      const payload = {
        title: form.title.trim(),
        date: form.date,
        ageGroup: form.ageGroup || undefined,
        activities: activities.filter((a) => a.name.trim()),
        learningGoals: form.learningGoals.trim() || undefined,
        materials: form.materials.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editingId) {
        await apiFetch(`/lesson-plans/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        setOk("Updated.");
      } else {
        await apiFetch("/lesson-plans", { method: "POST", body: JSON.stringify(payload) });
        setOk("Created.");
      }
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to save."));
    } finally {
      setSaving(false);
    }
  }

  async function publishToParents() {
    try {
      setPublishing(true);
      setError("");
      const firstPlan = plans[0];
      let content = `Theme: ${firstPlan.title}\n\nActivities this week:\n` +
        (Array.isArray(firstPlan.activities) ? firstPlan.activities.map((a) => `• ${a.name}`).join("\n") : "");
      if (firstPlan.learningGoals) {
        content += `\n\nLearning goals: ${firstPlan.learningGoals}`;
      }
      await apiFetch("/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "This Week's Theme — " + firstPlan.title,
          body: content,
          type: "CURRICULUM_UPDATE",
          audience: "PARENTS",
        }),
      });
      setOk("Activities published to parents!");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to publish."));
    } finally {
      setPublishing(false);
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this lesson plan?")) return;
    await apiFetch(`/lesson-plans/${id}`, { method: "DELETE" });
    await load();
  }

  const weekLabel = `${weekStart.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} — ${addDays(weekStart, 6).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`;

  // Group by date
  const byDate: Record<string, LessonPlan[]> = {};
  for (const p of plans) {
    const ds = new Date(p.date).toISOString().slice(0, 10);
    if (!byDate[ds]) byDate[ds] = [];
    byDate[ds].push(p);
  }

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro title="Curriculum" description="Weekly lesson plans aligned with the BC Early Learning Framework." />
          <div className="flex items-center gap-2">
            <button onClick={publishToParents} disabled={publishing || plans.length === 0} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
              <Megaphone className="h-3.5 w-3.5" />
              {publishing ? "Publishing..." : "Notify Parents"}
            </button>
            <button onClick={openCreate} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
              <Plus className="h-4 w-4" /> New plan
            </button>
          </div>
        </div>

        {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="mb-4 flex items-center justify-center gap-4">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-semibold text-slate-900">{weekLabel}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
        </div>

        {showForm && (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingId ? "Edit plan" : "New lesson plan"}</CardTitle>
                <button onClick={() => setShowForm(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Title *</div>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Date</div>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Age group</div>
                  <select value={form.ageGroup} onChange={(e) => setForm({ ...form, ageGroup: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    <option value="">All ages</option>
                    {AGE_GROUPS.map((ag) => <option key={ag.value} value={ag.value}>{ag.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Activities</div>
                {activities.map((a, i) => (
                  <div key={i} className="mb-2 flex gap-2">
                    <input value={a.name} onChange={(e) => { const arr = [...activities]; arr[i] = { ...arr[i], name: e.target.value }; setActivities(arr); }} placeholder="Activity name" className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs" />
                    <select value={a.developmentArea || ""} onChange={(e) => { const arr = [...activities]; arr[i] = { ...arr[i], developmentArea: e.target.value }; setActivities(arr); }} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs">
                      <option value="">Dev area</option>
                      {DEV_AREAS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input value={a.duration || ""} onChange={(e) => { const arr = [...activities]; arr[i] = { ...arr[i], duration: e.target.value }; setActivities(arr); }} placeholder="Duration" className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-xs" />
                    <button onClick={() => setActivities(activities.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500">&times;</button>
                  </div>
                ))}
                <button onClick={() => setActivities([...activities, { name: "", developmentArea: "", duration: "" }])} className="text-xs font-medium text-slate-500 hover:text-slate-700">+ Add activity</button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Learning goals</div>
                  <textarea value={form.learningGoals} onChange={(e) => setForm({ ...form, learningGoals: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none" />
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Materials needed</div>
                  <textarea value={form.materials} onChange={(e) => setForm({ ...form, materials: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none" />
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button onClick={save} disabled={saving || !form.title.trim()} className="inline-flex h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
                <button onClick={() => setShowForm(false)} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
        ) : plans.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-8 text-center">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <div className="text-sm text-slate-500">No lesson plans this week. <button onClick={openCreate} className="font-medium text-slate-700">Create one &rarr;</button></div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {Object.entries(byDate).sort().map(([dateStr, dayPlans]) => (
              <div key={dateStr}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {new Date(dateStr + "T12:00:00").toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric" })}
                </div>
                {dayPlans.map((p) => (
                  <Card key={p.id} className="mb-2 rounded-2xl border-0 shadow-sm">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{p.title}</span>
                            {p.ageGroup && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">{p.ageGroup}</span>}
                          </div>
                          {Array.isArray(p.activities) && p.activities.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {p.activities.map((a: Activity, i: number) => (
                                <span key={i} className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                                  a.developmentArea === "Physical/Motor" ? "border-blue-200 bg-blue-50 text-blue-700" :
                                  a.developmentArea === "Language/Communication" ? "border-amber-200 bg-amber-50 text-amber-700" :
                                  a.developmentArea === "Social/Emotional" ? "border-pink-200 bg-pink-50 text-pink-700" :
                                  a.developmentArea === "Cognitive" ? "border-violet-200 bg-violet-50 text-violet-700" :
                                  a.developmentArea === "Creative" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                                  "border-slate-200 bg-slate-50 text-slate-600"
                                }`}>
                                  {a.name}{a.duration ? ` (${a.duration})` : ""}
                                </span>
                              ))}
                            </div>
                          )}
                          {p.learningGoals && <div className="mt-2 text-sm text-slate-500">{p.learningGoals}</div>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Edit2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deletePlan(p.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
