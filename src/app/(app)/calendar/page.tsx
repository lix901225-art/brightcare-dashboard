"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Globe, Plus, Star, Trash2, X } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { readSession } from "@/lib/session";
import { getErrorMessage } from "@/lib/error";

/* ─── BC multicultural calendar events ─── */

type CalendarEvent = {
  name: string;
  date: string; /* MM-DD or YYYY-MM-DD for year-specific */
  culture: string;
  description: string;
  colour: string;
};

/* Events reflecting Greater Vancouver demographics */
const CULTURAL_EVENTS: CalendarEvent[] = [
  /* Canadian statutory / widely observed */
  { name: "New Year's Day", date: "01-01", culture: "Canadian", description: "National statutory holiday", colour: "border-red-200 bg-red-50 text-red-700" },
  { name: "Family Day (BC)", date: "02-17", culture: "BC Statutory", description: "BC statutory holiday — third Monday of February", colour: "border-red-200 bg-red-50 text-red-700" },
  { name: "Good Friday", date: "04-18", culture: "Canadian", description: "National statutory holiday (date varies by year)", colour: "border-red-200 bg-red-50 text-red-700" },
  { name: "Victoria Day", date: "05-19", culture: "BC Statutory", description: "BC statutory holiday — Monday before May 25", colour: "border-red-200 bg-red-50 text-red-700" },
  { name: "Canada Day", date: "07-01", culture: "Canadian", description: "National statutory holiday", colour: "border-red-200 bg-red-50 text-red-700" },
  { name: "BC Day", date: "08-04", culture: "BC Statutory", description: "BC statutory holiday — first Monday of August", colour: "border-red-200 bg-red-50 text-red-700" },
  { name: "National Day for Truth & Reconciliation", date: "09-30", culture: "Canadian / Indigenous", description: "Federal statutory holiday honouring residential school survivors", colour: "border-orange-200 bg-orange-50 text-orange-700" },
  { name: "Thanksgiving (Canada)", date: "10-13", culture: "Canadian", description: "Second Monday of October", colour: "border-red-200 bg-red-50 text-red-700" },
  { name: "Remembrance Day", date: "11-11", culture: "Canadian", description: "National day of remembrance", colour: "border-red-200 bg-red-50 text-red-700" },
  { name: "Christmas Day", date: "12-25", culture: "Canadian", description: "National statutory holiday", colour: "border-red-200 bg-red-50 text-red-700" },

  /* Chinese / East Asian */
  { name: "Lunar New Year (Spring Festival)", date: "01-29", culture: "Chinese", description: "Most significant Chinese holiday. Dragon dances, red envelopes, family gatherings. Large Chinese community in Vancouver.", colour: "border-rose-200 bg-rose-50 text-rose-700" },
  { name: "Lantern Festival (元宵节)", date: "02-12", culture: "Chinese", description: "Marks the end of Lunar New Year celebrations. Lanterns, tangyuan.", colour: "border-rose-200 bg-rose-50 text-rose-700" },
  { name: "Mid-Autumn Festival (中秋节)", date: "10-06", culture: "Chinese", description: "Mooncakes, lanterns, family reunion. One of the most important Chinese festivals.", colour: "border-rose-200 bg-rose-50 text-rose-700" },
  { name: "Dragon Boat Festival (端午节)", date: "05-31", culture: "Chinese", description: "Dragon boat races, zongzi (rice dumplings). Vancouver hosts major races.", colour: "border-rose-200 bg-rose-50 text-rose-700" },

  /* South Asian */
  { name: "Diwali (Festival of Lights)", date: "10-20", culture: "South Asian", description: "Festival of lights. Large South Asian community in Surrey and Metro Vancouver.", colour: "border-amber-200 bg-amber-50 text-amber-700" },
  { name: "Vaisakhi", date: "04-13", culture: "Punjabi / Sikh", description: "Major Sikh festival. Vancouver and Surrey host one of the largest Vaisakhi parades outside India.", colour: "border-amber-200 bg-amber-50 text-amber-700" },
  { name: "Holi", date: "03-14", culture: "South Asian", description: "Festival of colours celebrating spring. Growing celebrations in Metro Vancouver.", colour: "border-purple-200 bg-purple-50 text-purple-700" },
  { name: "Eid al-Fitr", date: "03-30", culture: "Islamic", description: "End of Ramadan. Date varies with lunar calendar.", colour: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { name: "Eid al-Adha", date: "06-06", culture: "Islamic", description: "Festival of Sacrifice. Date varies with lunar calendar.", colour: "border-emerald-200 bg-emerald-50 text-emerald-700" },

  /* Filipino */
  { name: "Philippine Independence Day", date: "06-12", culture: "Filipino", description: "Significant for the large Filipino community in Metro Vancouver.", colour: "border-blue-200 bg-blue-50 text-blue-700" },
  { name: "Flores de Mayo", date: "05-01", culture: "Filipino", description: "Month of May devotion. Cultural celebrations in Filipino communities.", colour: "border-blue-200 bg-blue-50 text-blue-700" },

  /* Indigenous */
  { name: "National Indigenous Peoples Day", date: "06-21", culture: "Indigenous", description: "Celebrates First Nations, Inuit, and Métis peoples. Important in BC reconciliation efforts.", colour: "border-orange-200 bg-orange-50 text-orange-700" },
  { name: "Moose Hide Campaign Day", date: "05-15", culture: "Indigenous", description: "Stand against violence toward women and children", colour: "border-orange-200 bg-orange-50 text-orange-700" },

  /* Japanese */
  { name: "Japanese New Year (Oshōgatsu)", date: "01-01", culture: "Japanese", description: "Traditional Japanese New Year celebrations.", colour: "border-pink-200 bg-pink-50 text-pink-700" },
  { name: "Children's Day (Kodomo no Hi)", date: "05-05", culture: "Japanese", description: "Celebrates children's wellbeing. Koinobori (carp streamers).", colour: "border-pink-200 bg-pink-50 text-pink-700" },

  /* Korean */
  { name: "Chuseok (Korean Thanksgiving)", date: "10-06", culture: "Korean", description: "Korean harvest festival, family gathering.", colour: "border-sky-200 bg-sky-50 text-sky-700" },

  /* Other multicultural */
  { name: "Nowruz (Persian New Year)", date: "03-20", culture: "Persian / Iranian", description: "Spring equinox celebration marking the Persian New Year.", colour: "border-teal-200 bg-teal-50 text-teal-700" },
];

const CULTURE_FILTERS = [
  "All",
  "Canadian",
  "BC Statutory",
  "Chinese",
  "South Asian",
  "Punjabi / Sikh",
  "Islamic",
  "Filipino",
  "Indigenous",
  "Japanese",
  "Korean",
  "Persian / Iranian",
];

type DbEvent = {
  id: string;
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  type: string;
  description?: string | null;
};

const EVENT_TYPES = ["HOLIDAY", "CULTURAL", "ACTIVITY", "FIELD_TRIP", "CLOSURE"] as const;

function eventTypeBadge(type: string) {
  switch (type) {
    case "HOLIDAY": return "border-red-200 bg-red-50 text-red-700";
    case "CULTURAL": return "border-amber-200 bg-amber-50 text-amber-700";
    case "CLOSURE": return "border-rose-200 bg-rose-50 text-rose-700";
    case "FIELD_TRIP": return "border-sky-200 bg-sky-50 text-sky-700";
    default: return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export default function CulturalCalendarPage() {
  const session = readSession();
  const canEdit = session?.role === "OWNER" || session?.role === "STAFF";

  /* DB events */
  const [dbEvents, setDbEvents] = useState<DbEvent[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState<string>("ACTIVITY");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/calendar/events?year=2026");
        if (res.ok) setDbEvents(await res.json());
      } catch { /* silent */ }
      finally { setDbLoading(false); }
    })();
  }, []);

  async function createEvent() {
    try {
      setSaving(true); setError(""); setOk("");
      if (!newTitle.trim()) throw new Error("Title is required.");
      if (!newDate) throw new Error("Date is required.");
      const res = await apiFetch("/calendar/events", {
        method: "POST",
        body: JSON.stringify({ title: newTitle.trim(), date: newDate, type: newType, description: newDesc.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Failed: ${res.status}`);
      setOk("Event added.");
      setDbEvents((prev) => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)));
      setShowCreate(false);
      setNewTitle(""); setNewDate(""); setNewDesc("");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to create event."));
    } finally { setSaving(false); }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    try {
      await apiFetch(`/calendar/events/${id}`, { method: "DELETE" });
      setDbEvents((prev) => prev.filter((e) => e.id !== id));
    } catch { /* silent */ }
  }

  async function seedHolidays() {
    try {
      setSaving(true);
      const res = await apiFetch("/calendar/seed-holidays", { method: "POST" });
      const data = await res.json();
      setOk(data?.message || "Holidays seeded.");
      // Reload
      const reloadRes = await apiFetch("/calendar/events?year=2026");
      if (reloadRes.ok) setDbEvents(await reloadRes.json());
    } catch { /* silent */ }
    finally { setSaving(false); }
  }

  /* Static cultural calendar */
  const [cultureFilter, setCultureFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("");

  const filtered = useMemo(() => {
    let events = CULTURAL_EVENTS;

    if (cultureFilter !== "All") {
      events = events.filter((e) => e.culture === cultureFilter);
    }

    if (monthFilter) {
      events = events.filter((e) => e.date.startsWith(monthFilter));
    }

    /* sort by date (MM-DD) */
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }, [cultureFilter, monthFilter]);

  /* group by month */
  const grouped = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of filtered) {
      const month = e.date.slice(0, 2);
      (map[month] ??= []).push(e);
    }
    return map;
  }, [filtered]);

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <RoleGate allow={["OWNER", "STAFF", "PARENT"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Calendar"
            description="Centre events, BC holidays, and multicultural awareness calendar."
          />
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={seedHolidays} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                <Star className="h-4 w-4" /> Seed BC holidays
              </button>
              <button onClick={() => setShowCreate(!showCreate)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
                <Plus className="h-4 w-4" /> Add event
              </button>
            </div>
          )}
        </div>

        {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {showCreate && canEdit && (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle>Add centre event</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Title</div>
                  <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="e.g. Spring Field Trip" />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Date</div>
                  <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Type</div>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Description</div>
                  <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="Optional details" />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={createEvent} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                  {saving ? "Saving..." : "Add event"}
                </button>
                <button onClick={() => setShowCreate(false)} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Centre Events from DB */}
        {dbEvents.length > 0 && (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle>Centre events & holidays</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dbEvents.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${eventTypeBadge(e.type)}`}>{e.type.replace("_", " ")}</span>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{e.title}</div>
                        <div className="text-xs text-slate-500">{new Date(e.date).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}{e.description ? ` — ${e.description}` : ""}</div>
                      </div>
                    </div>
                    {canEdit && (
                      <button onClick={() => deleteEvent(e.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cultural awareness calendar */}
        <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700">
          <strong>Cultural awareness:</strong> BrightCare centres serve families from many cultural backgrounds.
          This calendar helps staff plan inclusive activities and acknowledge important celebrations.
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={cultureFilter}
            onChange={(e) => setCultureFilter(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            {CULTURE_FILTERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">All months</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={String(i + 1).padStart(2, "0")}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Events by month */}
        {Object.keys(grouped).length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-8 text-center text-sm text-slate-500">
              No events match the current filter.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([month, events]) => (
                <Card key={month} className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {MONTH_NAMES[parseInt(month, 10) - 1]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {events.map((event) => (
                        <div
                          key={event.name}
                          className={`rounded-xl border p-4 ${event.colour}`}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <span className="font-semibold">{event.name}</span>
                              </div>
                              <div className="mt-1 text-sm opacity-80">
                                {event.description}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="inline-flex rounded-full border border-current/20 bg-white/50 px-2.5 py-0.5 text-xs font-medium">
                                {event.culture}
                              </span>
                              <span className="text-xs opacity-70">
                                {event.date.length === 5
                                  ? `${MONTH_NAMES[parseInt(event.date.slice(0, 2), 10) - 1]} ${parseInt(event.date.slice(3), 10)}`
                                  : event.date}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Legend */}
        <Card className="mt-6 rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Cultures represented</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CULTURE_FILTERS.filter((c) => c !== "All").map((culture) => {
                const sample = CULTURAL_EVENTS.find((e) => e.culture === culture);
                return (
                  <span
                    key={culture}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${sample?.colour || "border-slate-200 bg-slate-50 text-slate-600"}`}
                  >
                    <Star className="h-3 w-3" />
                    {culture}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
