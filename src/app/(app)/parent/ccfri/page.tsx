"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export default function CcfriPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      // Send confirmation as a message to OWNER
      await apiFetch("/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "CCFRI Eligibility Confirmed",
          body: "I confirm that my family's CCFRI/ACCB eligibility information has not changed significantly. Our child remains enrolled full-time.",
          isSystemMessage: true,
        }),
      });
      setConfirmed(true);
      toast.success("Eligibility confirmed! Your centre has been notified.");
    } catch {
      toast.error("Unable to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RoleGate allow={["PARENT", "OWNER"]}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <Link href="/parent" className="text-sm text-slate-500 hover:text-slate-700">
            &larr; Back to home
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-2xl font-semibold text-slate-900 mb-1">
            BC Childcare Subsidy
          </div>
          <div className="text-sm text-slate-500 mb-6">Annual Update</div>

          <div className="space-y-5 text-sm text-slate-700 leading-relaxed">
            <p>
              The BC government requires centres to confirm family eligibility each year
              for the <strong>Child Care Fee Reduction Initiative (CCFRI)</strong> and
              <strong> Affordable Child Care Benefit (ACCB)</strong>.
            </p>

            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-2">
                Your current subsidies
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">CCFRI (Fee Reduction)</span>
                  <span className="font-medium text-blue-700">Applied at centre level</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">ACCB (Affordable Child Care)</span>
                  <span className="font-medium text-slate-500">Varies by family income</span>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-800 mb-2">To continue receiving this subsidy:</div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                <li>Confirm your income hasn&apos;t changed significantly</li>
                <li>Your child must remain enrolled full-time</li>
                <li>Update any family information changes</li>
              </ol>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500 space-y-2">
              <p>
                <strong>Questions?</strong> Contact your centre or visit the BC Government website for more information.
              </p>
              <a
                href="https://www2.gov.bc.ca/gov/content/family-social-supports/caring-for-young-children/running-a-daycare-or-preschool/child-care-fee-reduction-initiative"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                BC Government CCFRI Page <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Chinese explanation */}
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-xs text-slate-600">
              <div className="font-semibold text-amber-800 mb-1">中文说明</div>
              <p>BC省政府要求托儿中心每年确认家庭的补贴资格。</p>
              <p className="mt-1">CCFRI（托儿费减免计划）和 ACCB（可负担托儿福利）需要每年更新。</p>
              <p className="mt-1">请确认您的家庭收入没有重大变化，且孩子仍在全日制入学。</p>
            </div>
          </div>

          {/* Confirm button */}
          <div className="mt-6 border-t border-slate-100 pt-6">
            {confirmed ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <Check className="h-5 w-5 text-emerald-600" />
                <div>
                  <div className="text-sm font-semibold text-emerald-800">Eligibility confirmed</div>
                  <div className="text-xs text-emerald-600">Your centre has been notified. Thank you!</div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "I confirm my eligibility →"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
