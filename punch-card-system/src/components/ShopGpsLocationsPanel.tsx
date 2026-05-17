"use client";

import { useCallback, useEffect, useState } from "react";
import { ShopLocationPicker, type ShopGpsForm } from "@/components/ShopLocationPicker";
import {
  HIGH_RISE_GPS_TIP,
  SHOP_GPS_LOCATION_TYPE_LABELS,
  type ShopGpsLocationRow,
} from "@/lib/shop-gps-locations";
import type { ShopGpsLocationType } from "@/lib/gps-shop-verify";

type LocationForm = {
  name: string;
  location_type: ShopGpsLocationType;
  is_active: boolean;
  gps: ShopGpsForm;
};

function emptyForm(): LocationForm {
  return {
    name: "",
    location_type: "main",
    is_active: true,
    gps: { latitude: "", longitude: "", allowed_radius_meters: "50" },
  };
}

function formFromRow(row: ShopGpsLocationRow): LocationForm {
  return {
    name: row.name,
    location_type: row.location_type,
    is_active: row.is_active,
    gps: {
      latitude: String(row.latitude),
      longitude: String(row.longitude),
      allowed_radius_meters: String(row.allowed_radius_meters),
    },
  };
}

function payloadFromForm(form: LocationForm) {
  return {
    name: form.name.trim(),
    location_type: form.location_type,
    is_active: form.is_active,
    latitude: form.gps.latitude.trim(),
    longitude: form.gps.longitude.trim(),
    allowed_radius_meters: Number(form.gps.allowed_radius_meters.trim() || "50"),
  };
}

type Props = {
  shopId: string;
  shopName: string;
};

export function ShopGpsLocationsPanel({ shopId, shopName }: Props) {
  const [locations, setLocations] = useState<ShopGpsLocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<LocationForm>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopId)}/locations`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Failed to load locations");
      }
      const j = (await res.json()) as { locations?: ShopGpsLocationRow[] };
      setLocations(j.locations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    void load();
  }, [load]);

  function startAdd() {
    setEditingId(null);
    setShowAdd(true);
    setForm(emptyForm());
  }

  function startEdit(row: ShopGpsLocationRow) {
    setShowAdd(false);
    setEditingId(row.id);
    setForm(formFromRow(row));
  }

  function cancelForm() {
    setEditingId(null);
    setShowAdd(false);
    setForm(emptyForm());
  }

  async function saveForm() {
    if (!form.name.trim()) {
      setError("Location name is required");
      return;
    }
    if (!form.gps.latitude.trim() || !form.gps.longitude.trim()) {
      setError("Set latitude and longitude for this point");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body = payloadFromForm(form);
      const url =
        editingId != null
          ? `/api/shops/${encodeURIComponent(shopId)}/locations/${encodeURIComponent(editingId)}`
          : `/api/shops/${encodeURIComponent(shopId)}/locations`;
      const res = await fetch(url, {
        method: editingId != null ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Could not save location");
      }
      cancelForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function removeLocation(id: string, name: string) {
    if (!window.confirm(`Remove GPS point "${name}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/shops/${encodeURIComponent(shopId)}/locations/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Could not remove");
      }
      if (editingId === id) cancelForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setSaving(false);
    }
  }

  const formOpen = showAdd || editingId != null;

  return (
    <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          GPS verification points
        </p>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{HIGH_RISE_GPS_TIP}</p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-xs text-zinc-500">Loading points…</p>
      ) : locations.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          No GPS points yet. Add at least one (e.g. Main Entrance).
        </p>
      ) : (
        <ul className="space-y-2">
          {locations.map((loc) => (
            <li
              key={loc.id}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {loc.name}
                    {!loc.is_active ? (
                      <span className="ml-2 font-normal text-zinc-500">(inactive)</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
                    {SHOP_GPS_LOCATION_TYPE_LABELS[loc.location_type]} · {loc.latitude.toFixed(5)},{" "}
                    {loc.longitude.toFixed(5)} · {loc.allowed_radius_meters} m
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => startEdit(loc)}
                    className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void removeLocation(loc.id, loc.name)}
                    className="rounded border border-red-200 px-2 py-1 text-red-800 dark:border-red-900 dark:text-red-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formOpen ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="mb-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {editingId ? "Edit location" : "Add location"}
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium">
              Name (shown on clock page)
              <input
                className="rounded border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Office 12F, Main Entrance"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              Type
              <select
                className="rounded border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
                value={form.location_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    location_type: e.target.value as ShopGpsLocationType,
                  }))
                }
              >
                {(Object.keys(SHOP_GPS_LOCATION_TYPE_LABELS) as ShopGpsLocationType[]).map(
                  (t) => (
                    <option key={t} value={t}>
                      {SHOP_GPS_LOCATION_TYPE_LABELS[t]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Active (used for clock verification)
            </label>
            <ShopLocationPicker
              form={form.gps}
              onChange={(gps) => setForm((f) => ({ ...f, gps }))}
              shopName={shopName}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveForm()}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save location"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={saving}
          onClick={startAdd}
          className="rounded-lg border border-dashed border-zinc-400 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-500 dark:text-zinc-300"
        >
          + Add GPS location
        </button>
      )}
    </div>
  );
}
