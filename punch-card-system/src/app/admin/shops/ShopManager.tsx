"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QrCodePanel } from "@/components/QrCodePanel";
import { ShopGpsLocationsPanel } from "@/components/ShopGpsLocationsPanel";
import { ShopLocationPicker, type ShopGpsForm } from "@/components/ShopLocationPicker";
import { HIGH_RISE_GPS_TIP } from "@/lib/shop-gps-locations";
import { buildClockUrlWithToken } from "@/lib/punch-qr-url";

type Shop = {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  allowed_radius_meters?: number;
  punch_qr_token?: string | null;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGps, setEditGps] = useState<ShopGpsForm>(emptyGpsForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shops");
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

  const clockBase = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/shop`;
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...gpsPayload(newGps) }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      await res.json();
      setNewName("");
      setNewGps(emptyGpsForm());
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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...gpsPayload(editGps) }),
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

  async function removeShop(id: string) {
    if (!window.confirm("Delete this shop? Only allowed if there is no staff and no attendance.")) return;
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/shops/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readApiError(res));
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
          Set GPS verification points per shop. Staff pass if they are within range of any active point.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{HIGH_RISE_GPS_TIP}</p>
      </div>

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
          const clockUrl =
            clockBase && s.punch_qr_token
              ? buildClockUrlWithToken(clockBase, s.id, s.punch_qr_token)
              : clockBase
                ? `${clockBase}/${s.id}/clock`
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
                        }}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={savingId === s.id}
                        onClick={() => void removeShop(s.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <ShopGpsLocationsPanel
                    shopId={s.id}
                    shopName={s.name}
                    hasMainShopGps={hasGps}
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
    </div>
  );
}
