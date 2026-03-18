"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InviteInfo = {
  email: string;
  role: string;
  centreName: string;
  expiresAt: string;
};

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/proxy/auth/invite/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Invalid invite.");
        setInfo(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unable to verify invite.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-sm text-slate-500">Verifying invite...</div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md rounded-2xl border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <X className="h-6 w-6 text-rose-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Invite not valid</h2>
            <p className="mt-2 text-sm text-slate-500">{error || "This invite link is invalid or has expired."}</p>
            <Link href="/login" className="mt-4 inline-flex h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
              Go to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md rounded-2xl border-0 shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle className="text-xl">You&apos;re invited!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-slate-600">
            You&apos;ve been invited to join <strong>{info.centreName}</strong> as a{" "}
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              {info.role}
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Invite for: {info.email}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Expires: {new Date(info.expiresAt).toLocaleDateString()}
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/login"
              className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800"
            >
              Sign in to accept invite
            </Link>
            <p className="text-xs text-slate-500">
              Sign in or create an account using <strong>{info.email}</strong>.
              Your account will be automatically linked to {info.centreName}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
