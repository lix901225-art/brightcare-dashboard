"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Edit2, FileText, Plus, Trash2, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

type Template = {
  id: string;
  name: string;
  meals?: string | null;
  activities?: string | null;
  notes?: string | null;
  createdAt: string;
};

const emptyForm = { name: "", meals: "", activities: "", notes: "" };

export default function ReportTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    try {
      setLoading(true);
      const res = await apiFetch("/daily-reports/templates");
      if (res.ok) setTemplates(await res.json());
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load templates."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(t: Template) {
    setForm({
      name: t.name || "",
      meals: t.meals || "",
      activities: t.activities || "",
      notes: t.notes || "",
    });
    setEditingId(t.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save() {
    try {
      setSaving(true);
      setError("");
      if (!form.name.trim()) throw new Error("Template name is required.");

      const payload = {
        name: form.name.trim(),
        meals: form.meals.trim() || undefined,
        activities: form.activities.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editingId) {
        const res = await apiFetch(`/daily-reports/templates/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Update failed.");
        setOk("Template updated.");
      } else {
        const res = await apiFetch("/daily-reports/templates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Create failed.");
        setOk("Template created.");
      }

      closeForm();
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to save template."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      const res = await apiFetch(`/daily-reports/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setOk("Template deleted.");
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to delete template."));
    }
  }

  const field = (label: string, key: keyof typeof form, opts?: { placeholder?: string; required?: boolean; multiline?: boolean }) => (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label} {opts?.required && <span className="text-rose-500">*</span>}
      </div>
      {opts?.multiline ? (
        <textarea
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={opts.placeholder}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-400"
        />
      ) : (
        <input
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={opts?.placeholder}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
        />
      )}
    </div>
  );

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Link href="/daily-reports" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
              <ChevronLeft className="h-4 w-4" /> Back to daily reports
            </Link>
            <PageIntro
              title="Report templates"
              description="Pre-fill templates for faster daily report creation. Staff can select a template to auto-populate meals, activities, and notes."
            />
          </div>
          <button
            onClick={openCreate}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> New template
          </button>
        </div>

        {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {showForm && (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingId ? "Edit template" : "New template"}</CardTitle>
                <button onClick={closeForm} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {field("Template name", "name", { placeholder: "e.g. Toddler Room — Full Day", required: true })}
                {field("Default meals", "meals", { placeholder: "e.g. AM snack, Lunch, PM snack", multiline: true })}
                {field("Default activities", "activities", { placeholder: "e.g. Circle time, outdoor play, art activity", multiline: true })}
                {field("Default notes", "notes", { placeholder: "e.g. Sunscreen applied before outdoor play", multiline: true })}
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={save}
                  disabled={saving || !form.name.trim()}
                  className="inline-flex h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update template" : "Save template"}
                </button>
                <button onClick={closeForm} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading templates...</div>
        ) : templates.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-8 text-center">
              <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <div className="text-sm text-slate-500">
                No templates yet.{" "}
                <button onClick={openCreate} className="font-medium text-slate-700 hover:text-slate-900">
                  Create your first template &rarr;
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                        <span className="font-semibold text-slate-900">{t.name}</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {t.meals && (
                          <div className="text-sm text-slate-500">
                            <span className="font-medium text-slate-600">Meals:</span> {t.meals}
                          </div>
                        )}
                        {t.activities && (
                          <div className="text-sm text-slate-500">
                            <span className="font-medium text-slate-600">Activities:</span> {t.activities}
                          </div>
                        )}
                        {t.notes && (
                          <div className="text-sm text-slate-500">
                            <span className="font-medium text-slate-600">Notes:</span> {t.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(t)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id, t.name)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50"
                      >
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
