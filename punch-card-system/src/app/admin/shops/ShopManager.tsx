"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QrCodePanel } from "@/components/QrCodePanel";
import { ShopGpsLocationsPanel } from "@/components/ShopGpsLocationsPanel";
import { ShopLocationPicker, type ShopGpsForm } from "@/components/ShopLocationPicker";
import { IndoorConfidenceModeField } from "@/components/admin/IndoorConfidenceModeField";
import { PhotoProofFallbackField } from "@/components/admin/PhotoProofFallbackField";
import { HIGH_RISE_GPS_TIP } from "@/lib/shop-gps-locations";
import { buildClockPageUrl } from "@/lib/clock-routes";
import { ShopOperatingHoursFields, schedulingFromShop } from "@/components/admin/shops/ShopOperatingHoursFields";
import { ShopShiftTemplatesPanel } from "@/components/admin/shops/ShopShiftTemplatesPanel";
import { DeleteShopModal } from "@/components/admin/shops/DeleteShopModal";
import { ShopStaffSchedulePanel } from "@/components/admin/shops/ShopStaffSchedulePanel";
import { DEFAULT_SHOP_SCHEDULING, type ShopSchedulingFields } from "@/lib/shop-scheduling";

type Shop = {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  allowed_radius_meters?: number;
  gps_indoor_mode?: boolean;
  allow_photo_proof_fallback?: boolean;
  punch_qr_token?: string | null;
  work_time_mode?: string;
  opening_time?: string | null;
  closing_time?: string | null;
  break_minutes?: number | null;
  created_at?: string;
  updated_at?: string;
};

type ApiErrJson = {
  error?: string;
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function formatApiError(j: ApiErrJson): string {
  const msg = j.error ?? j.message ?? "Request failed";
  const extra = [j.code && `code: ${j.code}`, j.details && `details: ${j.details}`, j.hint && `hint: ${j.hint}`]
    .filter(Boolean)
    .join("\n");
  return extra ? `${msg}\n${extra}` : msg;
}

async function readApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as ApiErrJson;
    return formatApiError(j);
  } catch {
    return text.trim() || `HTTP ${res.status}`;
  }
}

function gpsFromShop(s: Shop): ShopGpsForm {
  return {
    latitude: s.latitude != null ? String(s.latitude) : "",
    longitude: s.longitude != null ? String(s.longitude) : "",
    allowed_radius_meters: String(s.allowed_radius_meters ?? 50),
  };
}

function emptyGpsForm(): ShopGpsForm {
  return { latitude: "", longitude: "", allowed_radius_meters: "50" };
}

function gpsPayload(form: ShopGpsForm) {
  return {
    latitude: form.latitude.trim() === "" ? null : form.latitude.trim(),
    longitude: form.longitude.trim() === "" ? null : form.longitude.trim(),
    allowed_radius_meters: Number(form.allowed_radius_meters.trim() || "50"),
  };
}

export function ShopManager() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newGps, setNewGps] = useState<ShopGpsForm>(emptyGpsForm);
  const [newIndoorMode, setNewIndoorMode] = useState(false);
  const [newPhotoProof, setNewPhotoProof] = useState(false);
  const [newScheduling, setNewScheduling] = useState<ShopSchedulingFields>(DEFAULT_SHOP_SCHEDULING);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGps, setEditGps] = useState<ShopGpsForm>(emptyGpsForm);
  const [editIndoorMode, setEditIndoorMode] = useState(false);
  const [editPhotoProof, setEditPhotoProof] = useState(false);
  const [editScheduling, setEditScheduling] = useState<ShopSchedulingFields>(DEFAULT_SHOP_SCHEDULING);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shops", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const j = (await res.json()) as { shops?: Shop[] };
      setShops((j.shops ?? []) as Shop[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const appOrigin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  async function addShop() {
    const name = newName.trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    setSavingId("__add__");
    setError(null);
    try {
      const res = await fetch("/api/shops", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ...gpsPayload(newGps),
          gps_indoor_mode: newIndoorMode,
          allow_photo_proof_fallback: newPhotoProof,
          ...newScheduling,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      await res.json();
      setNewName("");
      setNewGps(emptyGpsForm());
      setNewIndoorMode(false);
      setNewPhotoProof(false);
      setNewScheduling(DEFAULT_SHOP_SCHEDULING);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create");
    } finally {
      setSavingId(null);
    }
  }

  async function saveEdit(id: string) {
    const name = editName.trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/shops/${id}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ...gpsPayload(editGps),
          gps_indoor_mode: editIndoorMode,
          allow_photo_proof_fallback: editPhotoProof,
          ...editScheduling,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      await res.json();
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingId(null);
    }
  }

  async function regenerateQrToken(shopId: string) {
    if (
      !window.confirm(
        "Regenerate clock QR? Old printed QR codes will stop working until staff scan the new one.",
      )
    ) {
      return;
    }
    setSavingId(shopId);
    setError(null);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopId)}/qr-token`, {
        credentials: "include",
        method: "POST",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; shop?: Shop };
      if (!res.ok) throw new Error(j.error || "Could not regenerate QR");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not regenerate QR");
    } finally {
      setSavingId(null);
    }
  }

  async function confirmPermanentDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setSavingId(id);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/shops/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setShops((prev) => prev.filter((s) => s.id !== id));
      if (editingId === id) setEditingId(null);
      setDeleteTarget(null);
      setSuccessMessage("Shop permanently deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setSavingId(null);
    }
  }

  if (loading && shops.length === 0) {
    return <div className="px-4 py-12 text-center text-zinc-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <Link href="/admin" className="text-sm font-medium text-blue-600 dark:text-blue-400">
          ← Attendance
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Shops</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {shops.length} shop{shops.length === 1 ? "" : "s"} in your company
          {shops.length > 0 ? " (counts toward your plan limit)" : ""}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Set GPS verification points per shop. Staff pass if they are within range of any active point.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{HIGH_RISE_GPS_TIP}</p>
      </div>

      {successMessage ? (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <div className="space-y-2 rounded-lg bg-red-50 px-3 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          <p className="text-xs text-red-700/90 dark:text-red-300/90">
            Check{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">.env.local</code> (copy from{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">.env.example</code>
            ): <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">SUPABASE_SERVICE_ROLE_KEY</code> must match
            the Supabase project where you ran <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">schema.sql</code>.
            Restart <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">next dev</code> after editing env.
          </p>
          <p className="text-xs">
            <Link
              href="/api/health/supabase"
              className="font-medium text-red-900 underline dark:text-red-100"
              target="_blank"
              rel="noreferrer"
            >
              Open Supabase connection diagnostic (JSON)
            </Link>
          </p>
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Add shop</h2>
        <div className="flex flex-col gap-4">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Shop name
            <input
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Pierre Cardin Silverlakes Batu Gajah"
            />
          </label>
          <ShopLocationPicker
            form={newGps}
            onChange={setNewGps}
            shopName={newName}
            onShopNameSuggestion={setNewName}
          />
          <IndoorConfidenceModeField checked={newIndoorMode} onChange={setNewIndoorMode} />
          <PhotoProofFallbackField checked={newPhotoProof} onChange={setNewPhotoProof} />
          <ShopOperatingHoursFields value={newScheduling} onChange={setNewScheduling} />
          <button
            type="button"
            disabled={savingId === "__add__"}
            onClick={() => void addShop()}
            className="self-start rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {savingId === "__add__" ? "Saving…" : "Add shop"}
          </button>
        </div>
      </section>

      <ul className="space-y-6">
        {shops.map((s) => {
          const clockUrl = appOrigin
            ? buildClockPageUrl(appOrigin, s.id, s.punch_qr_token ?? null)
            : "";
          const hasGps = s.latitude != null && s.longitude != null;
          return (
            <li
              key={s.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              {editingId === s.id ? (
                <div className="space-y-3">
                  <input
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <ShopLocationPicker
                    form={editGps}
                    onChange={setEditGps}
                    shopName={editName}
                    onShopNameSuggestion={setEditName}
                  />
                  <IndoorConfidenceModeField
                    checked={editIndoorMode}
                    onChange={setEditIndoorMode}
                    disabled={savingId === s.id}
                  />
                  <PhotoProofFallbackField
                    checked={editPhotoProof}
                    onChange={setEditPhotoProof}
                    disabled={savingId === s.id}
                  />
                  <ShopOperatingHoursFields
                    value={editScheduling}
                    onChange={setEditScheduling}
                    disabled={savingId === s.id}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingId === s.id}
                      onClick={() => void saveEdit(s.id)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{s.name}</h2>
                      {s.gps_indoor_mode ? (
                        <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                          Indoor Confidence Mode enabled
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-zinc-500">Standard GPS (fast)</p>
                      )}
                      {s.allow_photo_proof_fallback ? (
                        <p className="mt-0.5 text-xs font-medium text-violet-800 dark:text-violet-200">
                          Photo proof fallback enabled
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {schedulingFromShop(s).work_time_mode === "fixed"
                          ? `Fixed hours ${schedulingFromShop(s).opening_time}–${schedulingFromShop(s).closing_time}`
                          : "Shift based scheduling"}
                      </p>
                      <p className="mt-1 break-all text-xs text-zinc-500">{clockUrl}</p>
                      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {hasGps ? (
                          <>
                            GPS: {s.latitude}, {s.longitude} · radius {s.allowed_radius_meters ?? 50} m
                          </>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-300">GPS not set — clock in/out blocked</span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(s.id);
                          setEditName(s.name);
                          setEditGps(gpsFromShop(s));
                          setEditIndoorMode(s.gps_indoor_mode === true);
                          setEditPhotoProof(s.allow_photo_proof_fallback === true);
                          setEditScheduling(schedulingFromShop(s));
                        }}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={savingId === s.id}
                        onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                      >
                        Delete shop
                      </button>
                    </div>
                  </div>
                  <ShopGpsLocationsPanel
                    shopId={s.id}
                    shopName={s.name}
                    hasMainShopGps={hasGps}
                  />
                  {schedulingFromShop(s).work_time_mode === "shift_based" ? (
                    <ShopShiftTemplatesPanel shopId={s.id} />
                  ) : null}
                  <ShopStaffSchedulePanel
                    shopId={s.id}
                    workTimeMode={schedulingFromShop(s).work_time_mode}
                    shopHours={{
                      opening: schedulingFromShop(s).opening_time,
                      closing: schedulingFromShop(s).closing_time,
                      break_minutes: schedulingFromShop(s).break_minutes,
                    }}
                  />
                  <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Clock QR</p>
                      <button
                        type="button"
                        disabled={savingId === s.id}
                        onClick={() => void regenerateQrToken(s.id)}
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold dark:border-zinc-600 disabled:opacity-50"
                      >
                        {savingId === s.id ? "Updating…" : "Regenerate QR"}
                      </button>
                    </div>
                    {!s.punch_qr_token ? (
                      <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">
                        No QR token yet — tap Regenerate QR before staff scan.
                      </p>
                    ) : null}
                    <QrCodePanel
                      filenameBase={`shop-clock-${s.name}`}
                      printTitle={`Clock — ${s.name}`}
                      size={200}
                      value={clockUrl}
                    />
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {shops.length === 0 && !loading ? (
        <p className="text-center text-sm text-zinc-500">No shops yet. Add one above.</p>
      ) : null}

      <DeleteShopModal
        open={deleteTarget != null}
        shopName={deleteTarget?.name ?? ""}
        busy={deleteTarget != null && savingId === deleteTarget.id}
        onCancel={() => {
          if (savingId !== deleteTarget?.id) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmPermanentDelete()}
      />
    </div>
  );
}
