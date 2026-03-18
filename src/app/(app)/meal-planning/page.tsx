"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Save, Utensils } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

type MealMenu = {
  id?: string;
  date: string;
  breakfast?: string | null;
  morningSnack?: string | null;
  lunch?: string | null;
  afternoonSnack?: string | null;
  notes?: string | null;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEALS = [
  { key: "breakfast" as const, label: "Breakfast" },
  { key: "morningSnack" as const, label: "AM Snack" },
  { key: "lunch" as const, label: "Lunch" },
  { key: "afternoonSnack" as const, label: "PM Snack" },
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

export default function MealPlanningPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [menus, setMenus] = useState<Record<string, MealMenu>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const dates = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch(`/meal-menus/week?date=${weekStart.toISOString().slice(0, 10)}`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, MealMenu> = {};
        for (const m of (data.menus || [])) {
          const dateStr = new Date(m.date).toISOString().slice(0, 10);
          map[dateStr] = { ...m, date: dateStr };
        }
        // Fill missing
        for (const d of dates) {
          const ds = d.toISOString().slice(0, 10);
          if (!map[ds]) map[ds] = { date: ds };
        }
        setMenus(map);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load menus."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [weekStart]);

  function updateMenu(dateStr: string, field: string, value: string) {
    setMenus((prev) => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], date: dateStr, [field]: value },
    }));
  }

  async function saveDay(dateStr: string) {
    const menu = menus[dateStr];
    if (!menu) return;
    setSaving(dateStr);
    try {
      const res = await apiFetch("/meal-menus", {
        method: "POST",
        body: JSON.stringify({
          date: dateStr,
          breakfast: menu.breakfast || undefined,
          morningSnack: menu.morningSnack || undefined,
          lunch: menu.lunch || undefined,
          afternoonSnack: menu.afternoonSnack || undefined,
          notes: menu.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Save failed.");
      setOk(`Saved ${dateStr}`);
      setTimeout(() => setOk(""), 2000);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to save."));
    } finally {
      setSaving(null);
    }
  }

  async function copyLastWeek() {
    const lastMonday = addDays(weekStart, -7);
    try {
      const res = await apiFetch("/meal-menus/copy-week", {
        method: "POST",
        body: JSON.stringify({
          sourceStart: lastMonday.toISOString().slice(0, 10),
          targetStart: weekStart.toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) throw new Error("Copy failed.");
      setOk("Copied last week's menu.");
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to copy."));
    }
  }

  const weekLabel = `${weekStart.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} — ${addDays(weekStart, 4).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Meal planning"
            description="Weekly menu planning. Parents see today's menu in their portal."
          />
          <button
            onClick={copyLastWeek}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" /> Copy last week
          </button>
        </div>

        {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {/* Week navigator */}
        <div className="mb-4 flex items-center justify-center gap-4">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-slate-900">{weekLabel}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading menus...</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-5">
            {dates.map((d, i) => {
              const ds = d.toISOString().slice(0, 10);
              const menu = menus[ds] || { date: ds };
              const isToday = ds === new Date().toISOString().slice(0, 10);
              return (
                <Card key={ds} className={`rounded-2xl border-0 shadow-sm ${isToday ? "ring-2 ring-slate-900" : ""}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {DAYS[i]}
                      <div className="mt-0.5 text-[10px] font-normal text-slate-400">{ds}</div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {MEALS.map((meal) => (
                        <div key={meal.key}>
                          <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">{meal.label}</div>
                          <input
                            value={(menu as any)[meal.key] || ""}
                            onChange={(e) => updateMenu(ds, meal.key, e.target.value)}
                            placeholder={meal.label}
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-slate-400"
                          />
                        </div>
                      ))}
                      <div>
                        <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Notes</div>
                        <input
                          value={menu.notes || ""}
                          onChange={(e) => updateMenu(ds, "notes", e.target.value)}
                          placeholder="Allergies, etc."
                          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-slate-400"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => saveDay(ds)}
                      disabled={saving === ds}
                      className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Save className="h-3 w-3" />
                      {saving === ds ? "Saving..." : "Save"}
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
