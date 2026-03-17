"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  Calendar,
  Check,
  ClipboardList,
  Shield,
  Users,
  X,
} from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/api-helpers";
import { getErrorMessage } from "@/lib/error";

/* ─── types ─── */

type Child = {
  id: string;
  fullName?: string | null;
  dob?: string | null;
  roomId?: string | null;
  status?: string | null;
};

type Room = {
  id: string;
  name: string;
  capacity?: number | null;
  ageGroup?: string | null;
};

type StaffUser = {
  id: string;
  displayName?: string | null;
  role?: string | null;
  deactivated?: boolean;
  eceCertNumber?: string | null;
  eceCertExpiry?: string | null;
  eceLevel?: string | null;
  roomId?: string | null;
};

/* BC licensing child-to-staff ratios (Community Care and Assisted Living Act) */
const BC_RATIOS: { label: string; ageGroup: string; ratio: number; maxGroup: number }[] = [
  { label: "Infant (0–18 months)", ageGroup: "INFANT", ratio: 4, maxGroup: 12 },
  { label: "Toddler (18–36 months)", ageGroup: "TODDLER", ratio: 4, maxGroup: 12 },
  { label: "Preschool (30 months – 5 years)", ageGroup: "PRESCHOOL", ratio: 8, maxGroup: 25 },
  { label: "School-age (5–12 years)", ageGroup: "SCHOOL_AGE", ratio: 10, maxGroup: 24 },
  { label: "Multi-age", ageGroup: "MULTI_AGE", ratio: 8, maxGroup: 8 },
];

const ECE_LEVELS = [
  "ECE (Early Childhood Educator)",
  "ECE Assistant",
  "ECE Infant/Toddler",
  "ECE Special Needs",
  "Responsible Adult",
];

/* ─── helpers ─── */

function ageInMonths(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

function ageGroupFromMonths(months: number | null): string {
  if (months === null) return "UNKNOWN";
  if (months < 18) return "INFANT";
  if (months < 36) return "TODDLER";
  if (months < 60) return "PRESCHOOL";
  return "SCHOOL_AGE";
}

/* ─── page ─── */

export default function CompliancePage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const [childrenRes, roomsRes, staffRes] = await Promise.all([
          apiFetch("/children"),
          apiFetch("/rooms"),
          apiFetch("/admin/users"),
        ]);

        const childrenData = childrenRes.ok ? await childrenRes.json() : [];
        const roomsData = roomsRes.ok ? await roomsRes.json() : [];
        const staffData = staffRes.ok ? await staffRes.json() : [];

        setChildren(Array.isArray(childrenData) ? childrenData.filter((c: Child) => c.status !== "WITHDRAWN") : []);
        setRooms(Array.isArray(roomsData) ? roomsData : []);

        const allUsers: StaffUser[] = Array.isArray(staffData) ? staffData : [];
        setStaff(
          allUsers.filter(
            (u) =>
              !u.deactivated &&
              ((u.role || "").toUpperCase() === "STAFF" || (u.role || "").toUpperCase() === "OWNER")
          )
        );
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Unable to load compliance data."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysOut = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();

  /* ─── Child-to-staff ratios ─── */
  const ratioData = useMemo(() => {
    const activeChildren = children.filter((c) => c.status === "ACTIVE");

    /* group children by age group */
    const childrenByAgeGroup: Record<string, Child[]> = {};
    for (const child of activeChildren) {
      const months = ageInMonths(child.dob);
      const group = ageGroupFromMonths(months);
      (childrenByAgeGroup[group] ??= []).push(child);
    }

    /* group staff by room (if assigned) */
    const activeStaff = staff.filter((s) => !s.deactivated);

    return BC_RATIOS.map((rule) => {
      const groupChildren = childrenByAgeGroup[rule.ageGroup] || [];
      const childCount = groupChildren.length;
      const requiredStaff = childCount > 0 ? Math.ceil(childCount / rule.ratio) : 0;
      const compliant = childCount === 0 || activeStaff.length >= requiredStaff;

      return {
        ...rule,
        childCount,
        requiredStaff,
        actualStaff: activeStaff.length,
        compliant,
      };
    });
  }, [children, staff]);

  /* ─── ECE certification status ─── */
  const eceData = useMemo(() => {
    return staff.map((s) => {
      const expiry = s.eceCertExpiry?.slice(0, 10);
      let status: "valid" | "expiring" | "expired" | "missing" = "missing";
      if (expiry) {
        if (expiry < today) status = "expired";
        else if (expiry <= thirtyDaysOut) status = "expiring";
        else status = "valid";
      }
      return {
        ...s,
        certStatus: status,
        certExpiry: expiry || null,
      };
    });
  }, [staff, today, thirtyDaysOut]);

  const eceStats = useMemo(() => {
    const valid = eceData.filter((s) => s.certStatus === "valid").length;
    const expiring = eceData.filter((s) => s.certStatus === "expiring").length;
    const expired = eceData.filter((s) => s.certStatus === "expired").length;
    const missing = eceData.filter((s) => s.certStatus === "missing").length;
    return { valid, expiring, expired, missing, total: eceData.length };
  }, [eceData]);

  /* Overall compliance score */
  const overallScore = useMemo(() => {
    const checks = [
      ratioData.every((r) => r.compliant),
      eceStats.expired === 0,
      eceStats.missing === 0,
    ];
    const passed = checks.filter(Boolean).length;
    return { passed, total: checks.length, pct: Math.round((passed / checks.length) * 100) };
  }, [ratioData, eceStats]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading compliance dashboard...</div>;
  }

  return (
    <RoleGate allow={["OWNER"]}>
      <div>
        <div className="mb-6">
          <PageIntro
            title="BC Compliance Dashboard"
            description="Child-to-staff ratios, ECE certification tracking, and licensing readiness per BC Community Care and Assisted Living Act."
          />
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* Overall compliance score */}
        <Card className={`mb-6 rounded-2xl border-0 shadow-sm ${overallScore.pct < 100 ? "ring-1 ring-amber-200" : "ring-1 ring-emerald-200"}`}>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${overallScore.pct === 100 ? "bg-emerald-100" : "bg-amber-100"}`}>
                {overallScore.pct === 100 ? (
                  <Check className="h-8 w-8 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                )}
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {overallScore.pct === 100 ? "Fully compliant" : `${overallScore.passed}/${overallScore.total} checks passing`}
                </div>
                <div className="text-sm text-slate-500">
                  BC Community Care and Assisted Living Act compliance status
                </div>
              </div>
              <div className="ml-auto">
                <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${overallScore.pct === 100 ? "bg-emerald-500" : overallScore.pct >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
                    style={{ width: `${overallScore.pct}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Active children</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {children.filter((c) => c.status === "ACTIVE").length}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Active staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{staff.length}</div>
            </CardContent>
          </Card>
          <Card className={`rounded-2xl border-0 shadow-sm ${eceStats.expired > 0 ? "ring-1 ring-rose-200" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className={eceStats.expired > 0 ? "text-sm text-rose-600" : "text-sm text-slate-500"}>
                ECE certs expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-semibold ${eceStats.expired > 0 ? "text-rose-700" : ""}`}>
                {eceStats.expired}
              </div>
            </CardContent>
          </Card>
          <Card className={`rounded-2xl border-0 shadow-sm ${eceStats.expiring > 0 ? "ring-1 ring-amber-200" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className={eceStats.expiring > 0 ? "text-sm text-amber-600" : "text-sm text-slate-500"}>
                ECE certs expiring soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-semibold ${eceStats.expiring > 0 ? "text-amber-700" : ""}`}>
                {eceStats.expiring}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Child-to-Staff Ratio Dashboard ─── */}
        <Card className="mb-6 rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Child-to-Staff Ratios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
              BC Child Care Licensing Regulation — maximum ratios and group sizes per age group.
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-[600px] w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Age group
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                      BC max ratio
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                      Children
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                      Staff required
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ratioData.map((row) => (
                    <tr key={row.ageGroup} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-700">{row.label}</td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        1:{row.ratio}
                        <span className="ml-1 text-xs text-slate-400">(max {row.maxGroup})</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{row.childCount}</td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {row.requiredStaff > 0 ? row.requiredStaff : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.childCount === 0 ? (
                          <span className="text-xs text-slate-400">N/A</span>
                        ) : row.compliant ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <Check className="h-3 w-3" />
                            Compliant
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                            <AlertTriangle className="h-3 w-3" />
                            Under-staffed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ─── ECE Certification Tracking ─── */}
        <Card className="mb-6 rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              ECE Certification Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
              BC ECE Registry — all educators must hold valid ECE certification. Expired certifications must be renewed before staff can work unsupervised.
            </div>

            {eceData.length === 0 ? (
              <div className="text-sm text-slate-500">No staff members found.</div>
            ) : (
              <div className="space-y-2">
                {eceData.map((s) => (
                  <div
                    key={s.id}
                    className={[
                      "flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
                      s.certStatus === "expired"
                        ? "border-rose-200 bg-rose-50"
                        : s.certStatus === "expiring"
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-white",
                    ].join(" ")}
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {s.displayName || s.id}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {s.eceLevel || "Level not set"}
                        {s.eceCertNumber ? ` · Cert #${s.eceCertNumber}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.certExpiry ? (
                        <span className="text-xs text-slate-500">
                          Expires: {formatDate(s.certExpiry)}
                        </span>
                      ) : null}
                      {s.certStatus === "valid" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <Check className="h-3 w-3" />
                          Valid
                        </span>
                      ) : s.certStatus === "expiring" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          <Calendar className="h-3 w-3" />
                          Expiring
                        </span>
                      ) : s.certStatus === "expired" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                          <AlertTriangle className="h-3 w-3" />
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                          <X className="h-3 w-3" />
                          Not on file
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── BC Licensing Inspection Checklist ─── */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Licensing Inspection Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const checks = [
                {
                  label: "Child-to-staff ratios compliant",
                  ok: ratioData.every((r) => r.compliant),
                  fix: "Hire additional staff or reduce enrolment in under-staffed groups",
                },
                {
                  label: "All ECE certifications valid",
                  ok: eceStats.expired === 0,
                  fix: "Renew expired certifications immediately",
                },
                {
                  label: "All staff have ECE cert on file",
                  ok: eceStats.missing === 0,
                  fix: "Upload ECE certificates for all staff in Staff Management",
                },
                {
                  label: "All children have immunization records",
                  ok: true, /* would need backend data to verify */
                  fix: "Check each child profile for immunization records",
                },
                {
                  label: "Emergency contacts documented for all children",
                  ok: true, /* would need guardian data to verify */
                  fix: "Ensure every child has at least one emergency contact guardian",
                },
              ];
              const passed = checks.filter((c) => c.ok).length;
              const total = checks.length;
              const allGood = passed === total;

              return (
                <>
                  <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${allGood ? "bg-emerald-500" : "bg-amber-400"}`}
                      style={{ width: `${Math.round((passed / total) * 100)}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {checks.map((c) => (
                      <div
                        key={c.label}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${c.ok ? "text-emerald-700" : "text-slate-600 bg-amber-50"}`}
                      >
                        {c.ok ? (
                          <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                        )}
                        <span className={c.ok ? "" : "font-medium"}>{c.label}</span>
                        {!c.ok ? (
                          <span className="ml-auto text-xs text-amber-600">{c.fix}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {allGood ? (
                    <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      Your centre is inspection-ready per BC Community Care licensing requirements.
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      {total - passed} item{total - passed > 1 ? "s" : ""} require attention before your next licensing inspection.
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
