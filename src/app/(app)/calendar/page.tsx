"use client";

import { useMemo, useState } from "react";
import { Calendar, Globe, Star } from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function CulturalCalendarPage() {
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
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-6">
          <PageIntro
            title="Cultural Calendar"
            description="Multicultural awareness calendar for centre programming. Reflects Greater Vancouver's diverse communities — Chinese, South Asian, Filipino, Indigenous, and more."
          />
        </div>

        <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700">
          <strong>Why this matters:</strong> BrightCare centres serve families from many cultural backgrounds.
          This calendar helps staff plan inclusive activities, acknowledge important celebrations, and
          communicate with families about cultural events relevant to their community.
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
