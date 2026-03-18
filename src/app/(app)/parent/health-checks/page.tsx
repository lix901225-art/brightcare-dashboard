"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, ClipboardCheck, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { readSession } from "@/lib/session";

type HealthCheck = {
  id: string;
  childId: string;
  date: string;
  temperature?: number | null;
  symptoms?: string[] | null;
  passedScreening: boolean;
  notes?: string | null;
  createdAt: string;
};

type Child = { id: string; fullName?: string | null };

export default function ParentHealthChecksPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/children").then((r) => r.ok ? r.json() : []),
      apiFetch("/health-checks").then((r) => r.ok ? r.json() : []),
    ]).then(([childData, checkData]) => {
      const c = Array.isArray(childData) ? childData : (childData?.children || []);
      setChildren(c);
      setChecks(Array.isArray(checkData) ? checkData : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-center text-sm text-slate-400">Loading...</div>;

  return (
    <div className="mx-auto max-w-2xl p-4 lg:p-6">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Health checks</h1>
      <p className="mb-6 text-sm text-slate-500">Daily health screening records for your children.</p>

      {checks.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="py-8 text-center">
            <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <div className="text-sm text-slate-500">No health check records yet.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {checks.slice(0, 30).map((c) => {
            const child = children.find((ch) => ch.id === c.childId);
            const symptoms = Array.isArray(c.symptoms) ? c.symptoms as string[] : [];
            return (
              <Card key={c.id} className={`rounded-2xl border-0 shadow-sm ${!c.passedScreening ? "ring-2 ring-rose-200" : ""}`}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${c.passedScreening ? "bg-emerald-100" : "bg-rose-100"}`}>
                        {c.passedScreening ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{child?.fullName || "Child"}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{new Date(c.date).toLocaleDateString("en-CA")}</span>
                          {c.temperature != null && (
                            <span className="flex items-center gap-0.5">
                              <Thermometer className="h-3 w-3" /> {c.temperature}°C
                            </span>
                          )}
                        </div>
                        {symptoms.length > 0 && <div className="mt-1 text-xs text-rose-500">{symptoms.join(", ")}</div>}
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.passedScreening ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {c.passedScreening ? "Passed" : "Failed"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
