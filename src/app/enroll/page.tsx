"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PublicEnrollPage() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [childName, setChildName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [schedule, setSchedule] = useState("FULL_DAY");
  const [startDate, setStartDate] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [notes, setNotes] = useState("");

  // For now, use a fixed tenantId from URL or default
  const tenantId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("centre") || ""
    : "";

  async function handleSubmit() {
    try {
      setSaving(true);
      setError("");

      if (!childName.trim()) throw new Error("Child's name is required.");
      if (!dob) throw new Error("Date of birth is required.");
      if (!parentName.trim()) throw new Error("Your name is required.");
      if (!parentEmail.trim()) throw new Error("Email is required.");
      if (!parentPhone.trim()) throw new Error("Phone number is required.");

      const res = await fetch("/api/proxy/public/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenantId || undefined,
          childName: childName.trim(),
          dob,
          gender: gender || undefined,
          preferredSchedule: schedule,
          preferredStartDate: startDate || undefined,
          parentName: parentName.trim(),
          parentEmail: parentEmail.trim(),
          parentPhone: parentPhone.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Submission failed: ${res.status}`);

      setSuccess(data.centreName || "the centre");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to submit application.");
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-lg rounded-2xl border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Application submitted!</h2>
            <p className="mt-3 text-sm text-slate-600">
              Your child has been added to the waitlist at <strong>{success}</strong>.
              The centre will contact you at <strong>{parentEmail}</strong> with next steps.
            </p>
            <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
              Back to home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">BC</div>
          <h1 className="text-2xl font-bold text-slate-900">Enroll Your Child</h1>
          <p className="mt-2 text-sm text-slate-500">
            Apply for a spot at a BrightCare childcare centre. Licensed under BC Community Care and Assisted Living Act.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        )}

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle>Child information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Child&apos;s full name *</div>
                <input value={childName} onChange={(e) => setChildName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="Full name" />
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Date of birth *</div>
                <input type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Gender</div>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                </select>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Preferred schedule</div>
                <select value={schedule} onChange={(e) => setSchedule(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                  <option value="FULL_DAY">Full day</option>
                  <option value="HALF_DAY_AM">Half day (morning)</option>
                  <option value="HALF_DAY_PM">Half day (afternoon)</option>
                </select>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Preferred start date</div>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4 rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle>Parent / guardian information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Your full name *</div>
                <input value={parentName} onChange={(e) => setParentName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="Full name" />
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Email *</div>
                <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="email@example.com" />
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Phone *</div>
                <input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="604-555-0100" />
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Additional notes</div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-16 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Siblings at the centre, allergies, special needs, subsidy info..." />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Submit application"}
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-slate-400">
          By submitting, you agree to share this information with the childcare centre for enrollment purposes.
        </div>
      </div>
    </div>
  );
}
