"use client";

import { Building2, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import MockLogoutButton from "@/components/app/mock-logout-button";

const user = {
  name: "Xiang Li",
  email: "owner@brightcare.local",
  picture: "",
  role: "OWNER",
  tenantName: "BrightCare Demo",
};

export default function SaasShell() {
  const initials =
    user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r bg-white lg:block">
          <div className="flex h-16 items-center px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">BrightCare OS</div>
                <div className="text-xs text-slate-500">Multi-tenant daycare SaaS</div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="p-4">
            <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 px-4 text-sm text-slate-500">
              <span>{user.tenantName}</span>
              <span>⌄</span>
            </div>
          </div>

          <nav className="space-y-1 px-3 pb-6">
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </div>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500">
              <Users className="h-4 w-4" />
              People
            </div>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              RBAC / Membership
            </div>
          </nav>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
              <div>
                <div className="text-lg font-semibold">Workspace</div>
                <div className="text-sm text-slate-500">Mock auth now, Auth0 later</div>
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.picture} alt={user.name} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <div className="text-sm font-medium leading-none">{user.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{user.email}</div>
                </div>
                <MockLogoutButton />
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                  <CardDescription>Temporary mock auth shell.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  Build the product first. Replace this boundary with Auth0 later.
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Authorization</CardTitle>
                  <CardDescription>Business roles stay local.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  Owner/admin/staff/parent model should still live in your own backend and database.
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Commercial SaaS shell</CardTitle>
                  <CardDescription>Sellable product surface.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  Tenant switch slot, user menu, protected workspace and modern dashboard shell are ready.
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6 rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Current mock user</CardTitle>
                <CardDescription>Temporary local session for product development.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
{JSON.stringify(user, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
