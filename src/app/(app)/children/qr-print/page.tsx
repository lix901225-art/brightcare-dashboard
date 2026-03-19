"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { RoleGate } from "@/components/auth/role-gate";

type ChildQR = {
  id: string;
  fullName: string;
  qrDataUrl: string;
};

export default function QRPrintPage() {
  const [children, setChildren] = useState<ChildQR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/children");
        if (!res.ok) return;
        const data = await res.json();
        const arr = (Array.isArray(data) ? data : []).filter(
          (c: any) => c.status === "ACTIVE"
        );

        const withQr: ChildQR[] = [];
        for (const child of arr) {
          const qrRes = await apiFetch(`/children/${child.id}/qr-data`);
          if (qrRes.ok) {
            const qr = await qrRes.json();
            withQr.push({
              id: child.id,
              fullName: child.fullName || child.id,
              qrDataUrl: qr.qrDataUrl,
            });
          }
        }
        setChildren(withQr);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <RoleGate allow={["OWNER", "STAFF"]}>
      <div>
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link
            href="/children"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" /> Back to children
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" /> Print QR Codes
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Generating QR codes...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {children.map((child) => (
              <div
                key={child.id}
                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
              >
                <img
                  src={child.qrDataUrl}
                  alt={`QR code for ${child.fullName}`}
                  className="h-40 w-40"
                />
                <div className="mt-3 text-center text-sm font-semibold text-slate-900">
                  {child.fullName}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  BrightCare OS Check-in
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
