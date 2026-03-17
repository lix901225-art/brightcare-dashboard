"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  MapPin,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import { PageIntro } from "@/components/app/app-shell";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

/* ─── types ─── */

type Location = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  licenceNumber?: string | null;
  healthAuthority?: string | null;
  capacity?: number | null;
  isActive?: boolean;
  isPrimary?: boolean;
};

const BC_HEALTH_AUTHORITIES = [
  "Fraser Health",
  "Vancouver Coastal Health",
  "Interior Health",
  "Island Health",
  "Northern Health",
];

/* ─── page ─── */

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [backendReady, setBackendReady] = useState(true);

  /* form */
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [healthAuthority, setHealthAuthority] = useState("");
  const [capacity, setCapacity] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch("/locations").catch(() => null);
        if (!res || res.status === 404) {
          setBackendReady(false);
          setLocations([]);
        } else if (res.ok) {
          const data = await res.json();
          setLocations(Array.isArray(data) ? data : []);
        }
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Unable to load locations."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function resetForm() {
    setName("");
    setAddress("");
    setCity("");
    setPostalCode("");
    setPhone("");
    setEmail("");
    setLicenceNumber("");
    setHealthAuthority("");
    setCapacity("");
  }

  async function createLocation() {
    try {
      setSaving(true);
      setError("");
      setOk("");
      if (!name.trim()) throw new Error("Location name is required.");

      const res = await apiFetch("/locations", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          province: "BC",
          postalCode: postalCode.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          licenceNumber: licenceNumber.trim() || undefined,
          healthAuthority: healthAuthority || undefined,
          capacity: capacity ? Number(capacity) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Create failed: ${res.status}`);

      setOk("Location added.");
      setShowCreate(false);
      resetForm();
      setLocations((prev) => [...prev, data]);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to create location."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate allow={["OWNER"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Locations"
            description="Manage multiple childcare centres. Each location has its own licence, health authority, and capacity."
          />
          <button
            onClick={() => setShowCreate(true)}
            disabled={!backendReady}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add location
          </button>
        </div>

        {ok ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {ok}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {!backendReady ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <div className="text-lg font-semibold text-slate-700">
                Multi-location management coming soon
              </div>
              <div className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                The backend API for multi-location management is being prepared. Once the{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">/locations</code>{" "}
                endpoint is available, you&apos;ll be able to manage multiple centres, each with
                separate BC licensing, health authority assignment, and capacity tracking.
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {showCreate ? (
              <Card className="mb-6 rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Add location</CardTitle>
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        resetForm();
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Centre name <span className="text-rose-500">*</span>
                      </div>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. BrightCare Vancouver West"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        BC Facility Licence #
                      </div>
                      <input
                        value={licenceNumber}
                        onChange={(e) => setLicenceNumber(e.target.value)}
                        placeholder="e.g. LIC-12345"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Address
                      </div>
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street address"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                          City
                        </div>
                        <input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Vancouver"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                        />
                      </div>
                      <div>
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                          Postal code
                        </div>
                        <input
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="V6B 1A1"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Health authority
                      </div>
                      <select
                        value={healthAuthority}
                        onChange={(e) => setHealthAuthority(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      >
                        <option value="">Select health authority</option>
                        {BC_HEALTH_AUTHORITIES.map((ha) => (
                          <option key={ha} value={ha}>
                            {ha}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Licensed capacity
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        placeholder="e.g. 48"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Phone
                      </div>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="604-555-0123"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Email
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="west@brightcare.ca"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={createLocation}
                      disabled={saving || !name.trim()}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save location"}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        resetForm();
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Location list */}
            {locations.length === 0 && !loading ? (
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="py-8 text-center">
                  <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <div className="text-sm text-slate-500">
                    No locations configured yet.{" "}
                    <button
                      onClick={() => setShowCreate(true)}
                      className="font-medium text-slate-700 hover:text-slate-900"
                    >
                      Add your first centre &rarr;
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {locations.map((loc) => (
                  <Card key={loc.id} className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="py-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-slate-400" />
                            <span className="text-lg font-semibold text-slate-900">
                              {loc.name}
                            </span>
                            {loc.isPrimary ? (
                              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                                Primary
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                            {loc.address ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {[loc.address, loc.city, "BC", loc.postalCode]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            ) : null}
                            {loc.phone ? <span>{loc.phone}</span> : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {loc.licenceNumber ? (
                              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                                Licence: {loc.licenceNumber}
                              </span>
                            ) : null}
                            {loc.healthAuthority ? (
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                {loc.healthAuthority}
                              </span>
                            ) : null}
                            {loc.capacity ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                <Users className="h-3 w-3" />
                                Capacity: {loc.capacity}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </RoleGate>
  );
}
