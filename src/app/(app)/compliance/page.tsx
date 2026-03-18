"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  Calendar,
  Check,
  ClipboardList,
  Plus,
  Shield,
  Users,
  X,
} from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/api-helpers";
import { PageLoadingSkeleton } from "@/components/ui/skeleton";
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
  const [immSummary, setImmSummary] = useState<Array<{ childId: string; childName: string; totalRecords: number; completedCount: number; requiredCount: number; missingVaccines: string[]; isComplete: boolean }>>([]);
  const [firstAidCerts, setFirstAidCerts] = useState<Array<{ id: string; userId: string; staffName?: string | null; level?: string | null; expiresAt?: string | null; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const [childrenRes, roomsRes, staffRes, immRes] = await Promise.all([
          apiFetch("/children"),
          apiFetch("/rooms"),
          apiFetch("/admin/users"),
          apiFetch("/compliance/immunization-summary").catch(() => null),
        ]);

        const childrenData = childrenRes.ok ? await childrenRes.json() : [];
        const roomsData = roomsRes.ok ? await roomsRes.json() : [];
        const staffData = staffRes.ok ? await staffRes.json() : [];
        if (immRes?.ok) {
          const immData = await immRes.json();
          setImmSummary(Array.isArray(immData) ? immData : []);
        }

        const faRes = await apiFetch("/compliance/first-aid-certs").catch(() => null);
        if (faRes?.ok) {
          const faData = await faRes.json();
          setFirstAidCerts(Array.isArray(faData) ? faData : []);
        }

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
    return <PageLoadingSkeleton />;
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
        {eceStats.expired > 0 && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <div className="text-sm font-semibold text-rose-800">
                {eceStats.expired} staff ECE certification{eceStats.expired > 1 ? "s" : ""} expired
              </div>
              <div className="mt-0.5 text-xs text-rose-600">
                Expired certifications violate BC Community Care and Assisted Living Act requirements. Update immediately.
              </div>
            </div>
          </div>
        )}
        {eceStats.expiring > 0 && eceStats.expired === 0 && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <div className="text-sm font-semibold text-amber-800">
                {eceStats.expiring} staff ECE certification{eceStats.expiring > 1 ? "s" : ""} expiring within 30 days
              </div>
              <div className="mt-0.5 text-xs text-amber-600">
                Renew before expiry to maintain BC licensing compliance.
              </div>
            </div>
          </div>
        )}

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

        {/* ─── Immunization Completeness ─── */}
        {immSummary.length > 0 && (
          <Card className="mt-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Immunization records</CardTitle>
                <span className={[
                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                  immSummary.every((c) => c.isComplete)
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700",
                ].join(" ")}>
                  {immSummary.filter((c) => c.isComplete).length}/{immSummary.length} complete
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {immSummary.map((child) => (
                  <div key={child.childId} className={[
                    "flex items-center justify-between rounded-xl border p-3",
                    child.isComplete ? "border-slate-200" : "border-amber-200 bg-amber-50/30",
                  ].join(" ")}>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{child.childName}</div>
                      {child.missingVaccines.length > 0 && (
                        <div className="mt-0.5 text-xs text-amber-600">
                          Missing: {child.missingVaccines.join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{child.completedCount}/{child.requiredCount}</span>
                      {child.isComplete ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── First Aid Certifications ─── */}
        {firstAidCerts.length > 0 && (
          <Card className="mt-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>First aid certifications</CardTitle>
                <span className={[
                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                  firstAidCerts.some((c) => c.status === "expired")
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : firstAidCerts.some((c) => c.status === "expiring")
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700",
                ].join(" ")}>
                  {firstAidCerts.filter((c) => c.status === "valid").length}/{firstAidCerts.length} valid
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-xs text-slate-500">BC requires all staff to hold valid first aid certification (renewal every 2 years).</div>
              <div className="space-y-2">
                {firstAidCerts.map((cert) => (
                  <div key={cert.id} className={[
                    "flex items-center justify-between rounded-xl border p-3",
                    cert.status === "expired" ? "border-rose-200 bg-rose-50/30" : cert.status === "expiring" ? "border-amber-200 bg-amber-50/30" : "border-slate-200",
                  ].join(" ")}>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{cert.staffName || "Staff"}</div>
                      <div className="text-xs text-slate-500">{cert.level || "First Aid"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {cert.expiresAt && <span className="text-xs text-slate-500">Exp: {cert.expiresAt.slice(0, 10)}</span>}
                      <span className={[
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                        cert.status === "expired" ? "border-rose-200 bg-rose-50 text-rose-700"
                          : cert.status === "expiring" ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700",
                      ].join(" ")}>
                        {cert.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                  ok: immSummary.length > 0 && immSummary.every((c) => c.isComplete),
                  fix: immSummary.filter((c) => !c.isComplete).length > 0
                    ? `${immSummary.filter((c) => !c.isComplete).length} child(ren) missing vaccines`
                    : "Check each child profile for immunization records",
                },
                {
                  label: "All staff have valid first aid certification",
                  ok: firstAidCerts.length > 0 && firstAidCerts.every((c) => c.status === "valid"),
                  fix: firstAidCerts.filter((c) => c.status !== "valid").length > 0
                    ? `${firstAidCerts.filter((c) => c.status !== "valid").length} cert(s) expired or expiring`
                    : "Upload first aid certificates for all staff",
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
        {/* ─── Health Authority Inspection Log ─── */}
        <InspectionLog />
      </div>
    </RoleGate>
  );
}

/* ─── Inspection Log Component ─── */

type InspectionRecord = {
  id: string;
  date: string;
  healthAuthority: string;
  inspectorName?: string | null;
  result: string;
  notes?: string | null;
  followUpRequired?: boolean;
  followUpDate?: string | null;
};

const HA_OPTIONS = [
  "Fraser Health",
  "Vancouver Coastal Health",
  "Interior Health",
  "Island Health",
  "Northern Health",
];

function InspectionLog() {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  /* form */
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [healthAuthority, setHealthAuthority] = useState(HA_OPTIONS[0]);
  const [inspectorName, setInspectorName] = useState("");
  const [result, setResult] = useState("Pass");
  const [notes, setNotes] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/compliance/inspections");
        if (res.ok) {
          const data = await res.json();
          setRecords(Array.isArray(data) ? data : []);
        }
      } catch {
        /* endpoint may not exist yet */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function addRecord() {
    try {
      setSaving(true);
      const res = await apiFetch("/compliance/inspections", {
        method: "POST",
        body: JSON.stringify({
          date,
          healthAuthority,
          inspectorName: inspectorName.trim() || undefined,
          result,
          notes: notes.trim() || undefined,
          followUpRequired,
          followUpDate: followUpDate || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecords((prev) => [data, ...prev]);
        setShowAdd(false);
        setInspectorName("");
        setNotes("");
        setFollowUpRequired(false);
        setFollowUpDate("");
      }
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-6 rounded-2xl border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Health Authority Inspection Log
          </CardTitle>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3 w-3" />
            Log inspection
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
          Record inspections from Fraser Health, Vancouver Coastal Health, Interior Health, Island Health, or Northern Health.
          Required for BC Community Care and Assisted Living Act compliance.
        </div>

        {showAdd ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Date</div>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Health authority</div>
                <select value={healthAuthority} onChange={(e) => setHealthAuthority(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                  {HA_OPTIONS.map((ha) => <option key={ha} value={ha}>{ha}</option>)}
                </select>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Inspector name</div>
                <input value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} placeholder="Optional" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Result</div>
                <select value={result} onChange={(e) => setResult(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                  <option value="Pass">Pass</option>
                  <option value="Conditional Pass">Conditional Pass</option>
                  <option value="Fail">Fail</option>
                  <option value="Follow-up Required">Follow-up Required</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Notes</div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Inspection findings, observations, required corrections..." className="min-h-[60px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none" />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={followUpRequired} onChange={(e) => setFollowUpRequired(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                Follow-up required
              </label>
              {followUpRequired ? (
                <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              ) : null}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={addRecord} disabled={saving} className="inline-flex h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                {saving ? "..." : "Save"}
              </button>
              <button onClick={() => setShowAdd(false)} className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-sm text-slate-500">
            No inspections logged yet.{" "}
            <button onClick={() => setShowAdd(true)} className="font-medium text-slate-700 hover:text-slate-900">
              Log your first inspection &rarr;
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className={[
                "rounded-xl border p-3",
                r.result === "Pass" ? "border-emerald-200 bg-emerald-50" :
                r.result === "Fail" ? "border-rose-200 bg-rose-50" :
                "border-amber-200 bg-amber-50",
              ].join(" ")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{r.healthAuthority}</span>
                    <span className={[
                      "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                      r.result === "Pass" ? "border-emerald-200 text-emerald-700" :
                      r.result === "Fail" ? "border-rose-200 text-rose-700" :
                      "border-amber-200 text-amber-700",
                    ].join(" ")}>{r.result}</span>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(r.date)}</span>
                </div>
                {r.inspectorName ? <div className="mt-1 text-xs text-slate-500">Inspector: {r.inspectorName}</div> : null}
                {r.notes ? <div className="mt-1 text-sm text-slate-600">{r.notes}</div> : null}
                {r.followUpRequired ? (
                  <div className="mt-1 text-xs font-medium text-amber-700">
                    Follow-up required{r.followUpDate ? ` by ${formatDate(r.followUpDate)}` : ""}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
