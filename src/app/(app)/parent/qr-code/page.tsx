"use client";

import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

type ChildQR = {
  childId: string;
  childName: string;
  qrDataUrl: string;
};

export default function ParentQRCodePage() {
  const [qrCodes, setQrCodes] = useState<ChildQR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const childRes = await apiFetch("/children");
        if (!childRes.ok) return;
        const children = await childRes.json();
        const arr = Array.isArray(children) ? children : [];

        const codes: ChildQR[] = [];
        for (const child of arr) {
          const qrRes = await apiFetch(`/children/${child.id}/qr-data`);
          if (qrRes.ok) codes.push(await qrRes.json());
        }
        setQrCodes(codes);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6 text-center text-sm text-slate-400">Loading QR codes...</div>;

  return (
    <div className="mx-auto max-w-md p-4 lg:p-6">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">QR Code Check-in</h1>
      <p className="mb-6 text-sm text-slate-500">
        Show this QR code to staff when dropping off or picking up your child.
      </p>

      {qrCodes.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="py-8 text-center">
            <QrCode className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <div className="text-sm text-slate-500">No QR codes available.</div>
          </CardContent>
        </Card>
      ) : (
        qrCodes.map((qr) => (
          <Card key={qr.childId} className="mb-4 rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-lg">{qr.childName}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <img
                src={qr.qrDataUrl}
                alt={`QR code for ${qr.childName}`}
                className="h-64 w-64 rounded-xl"
              />
              <p className="mt-3 text-center text-xs text-slate-400">
                Show this to staff at drop-off or pick-up
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
