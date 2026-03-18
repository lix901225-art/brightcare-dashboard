"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Check,
  Edit2,
  MapPin,
  Plus,
  Star,
  Trash2,
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
  _count?: { rooms: number };
};

const BC_HEALTH_AUTHORITIES = [
  "Fraser Health",
  "Vancouver Coastal Health",
  "Interior Health",
  "Island Health",
  "Northern Health",
];

const emptyForm = {
  name: "",
  address: "",
  city: "",
  postalCode: "",
  phone: "",
  email: "",
  licenceNumber: "",
  healthAuthority: "",
  capacity: "",
};

/* ─── page ─── */

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    try {
      setLoading(true);
      const res = await apiFetch("/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(Array.isArray(data) ? data : []);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to load locations."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(loc: Location) {
    setForm({
      name: loc.name || "",
      address: loc.address || "",
      city: loc.city || "",
      postalCode: loc.postalCode || "",
      phone: loc.phone || "",
      email: loc.email || "",
      licenceNumber: loc.licenceNumber || "",
      healthAuthority: loc.healthAuthority || "",
      capacity: loc.capacity ? String(loc.capacity) : "",
    });
    setEditingId(loc.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveLocation() {
    try {
      setSaving(true);
      setError("");
      setOk("");
      if (!form.name.trim()) throw new Error("Location name is required.");

      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        province: "BC",
        postalCode: form.postalCode.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        licenceNumber: form.licenceNumber.trim() || undefined,
        healthAuthority: form.healthAuthority || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      };

      if (editingId) {
        const res = await apiFetch(`/locations/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `Update failed: ${res.status}`);
        }
        setOk("Location updated.");
      } else {
        const res = await apiFetch("/locations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `Create failed: ${res.status}`);
        }
        setOk("Location added.");
      }

      closeForm();
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to save location."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteLocation(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      setError("");
      const res = await apiFetch(`/locations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Delete failed: ${res.status}`);
      }
      setOk("Location deleted.");
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to delete location."));
    }
  }

  async function setPrimary(id: string) {
    try {
      setError("");
      const res = await apiFetch(`/locations/${id}/set-primary`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Failed: ${res.status}`);
      }
      setOk("Primary location updated.");
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to set primary location."));
    }
  }

  const field = (label: string, key: keyof typeof form, opts?: { type?: string; placeholder?: string; required?: boolean }) => (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label} {opts?.required && <span className="text-rose-500">*</span>}
      </div>
      <input
        type={opts?.type || "text"}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={opts?.placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
      />
    </div>
  );

  return (
    <RoleGate allow={["OWNER"]}>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <PageIntro
            title="Locations"
            description="Manage multiple childcare centres. Each location has its own licence, health authority, and capacity."
          />
          <button
            onClick={openCreate}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add location
          </button>
        </div>

        {ok && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {ok}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {showForm && (
          <Card className="mb-6 rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingId ? "Edit location" : "Add location"}</CardTitle>
                <button
                  onClick={closeForm}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {field("Centre name", "name", { placeholder: "e.g. BrightCare Vancouver West", required: true })}
                {field("BC Facility Licence #", "licenceNumber", { placeholder: "e.g. LIC-12345" })}
                {field("Address", "address", { placeholder: "Street address" })}
                <div className="grid grid-cols-2 gap-3">
                  {field("City", "city", { placeholder: "Vancouver" })}
                  {field("Postal code", "postalCode", { placeholder: "V6B 1A1" })}
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Health authority
                  </div>
                  <select
                    value={form.healthAuthority}
                    onChange={(e) => setForm((f) => ({ ...f, healthAuthority: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="">Select health authority</option>
                    {BC_HEALTH_AUTHORITIES.map((ha) => (
                      <option key={ha} value={ha}>{ha}</option>
                    ))}
                  </select>
                </div>
                {field("Licensed capacity", "capacity", { type: "number", placeholder: "e.g. 48" })}
                {field("Phone", "phone", { placeholder: "604-555-0123" })}
                {field("Email", "email", { type: "email", placeholder: "west@brightcare.ca" })}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={saveLocation}
                  disabled={saving || !form.name.trim()}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update location" : "Save location"}
                </button>
                <button
                  onClick={closeForm}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location list */}
        {locations.length === 0 && !loading ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-8 text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <div className="text-sm text-slate-500">
                No locations configured yet.{" "}
                <button
                  onClick={openCreate}
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 flex-shrink-0 text-slate-400" />
                        <span className="truncate text-lg font-semibold text-slate-900">
                          {loc.name}
                        </span>
                        {loc.isPrimary && (
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                            Primary
                          </span>
                        )}
                        {loc.isActive === false && (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        {loc.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {[loc.address, loc.city, "BC", loc.postalCode]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                        {loc.phone && <span>{loc.phone}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {loc.licenceNumber && (
                          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                            Licence: {loc.licenceNumber}
                          </span>
                        )}
                        {loc.healthAuthority && (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            {loc.healthAuthority}
                          </span>
                        )}
                        {loc.capacity != null && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            <Users className="h-3 w-3" />
                            Capacity: {loc.capacity}
                          </span>
                        )}
                        {loc._count?.rooms != null && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            {loc._count.rooms} room{loc._count.rooms !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!loc.isPrimary && (
                        <button
                          onClick={() => setPrimary(loc.id)}
                          title="Set as primary"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Set primary
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(loc)}
                        title="Edit"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {!loc.isPrimary && (
                        <button
                          onClick={() => deleteLocation(loc.id, loc.name)}
                          title="Delete"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
