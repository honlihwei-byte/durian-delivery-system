"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getStaffPosition } from "@/lib/geolocation-client";
import { searchPlaces, suggestShopNameFromPlace, type NominatimPlace } from "@/lib/nominatim";

export type ShopGpsForm = {
  latitude: string;
  longitude: string;
  allowed_radius_meters: string;
};

type StatusTone = "idle" | "loading" | "success" | "error";

type LocationStatus = {
  tone: StatusTone;
  message: string;
} | null;

type ShopLocationPickerProps = {
  form: ShopGpsForm;
  onChange: (next: ShopGpsForm) => void;
  /** When set, selecting a search result can fill the shop name if it is empty. */
  shopName?: string;
  onShopNameSuggestion?: (name: string) => void;
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base dark:border-zinc-600 dark:bg-zinc-900";

export function ShopLocationPicker({
  form,
  onChange,
  shopName = "",
  onShopNameSuggestion,
}: ShopLocationPickerProps) {
  const listId = useId();
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<NominatimPlace[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [status, setStatus] = useState<LocationStatus>(null);

  // Debounced Nominatim search (min 3 chars, 450ms delay — respects free API rate limits).
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const results = await searchPlaces(q);
          setSearchResults(results);
          setSearchOpen(true);
        } catch (e) {
          setSearchResults([]);
          setStatus({
            tone: "error",
            message: e instanceof Error ? e.message : "Could not search places",
          });
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Close suggestions when tapping outside (mobile-friendly).
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const applyCoordinates = useCallback(
    (lat: number, lng: number, successMessage: string) => {
      onChange({
        latitude: String(Number(lat.toFixed(6))),
        longitude: String(Number(lng.toFixed(6))),
        allowed_radius_meters: form.allowed_radius_meters,
      });
      setStatus({ tone: "success", message: successMessage });
    },
    [form.allowed_radius_meters, onChange],
  );

  async function useCurrentLocation() {
    setGpsLoading(true);
    setStatus({ tone: "loading", message: "Getting your current location…" });
    try {
      const { latitude, longitude } = await getStaffPosition();
      applyCoordinates(latitude, longitude, "Location filled from your device GPS.");
      setSearchQuery("");
      setSearchResults([]);
      setSearchOpen(false);
    } catch (e) {
      setStatus({
        tone: "error",
        message: e instanceof Error ? e.message : "Could not get current location",
      });
    } finally {
      setGpsLoading(false);
    }
  }

  function selectPlace(place: NominatimPlace) {
    const lat = Number(place.lat);
    const lng = Number(place.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setStatus({ tone: "error", message: "Invalid coordinates from search result." });
      return;
    }

    applyCoordinates(lat, lng, "Coordinates filled from place search.");

    // Optionally suggest shop name when the admin has not typed one yet.
    if (onShopNameSuggestion && !shopName.trim()) {
      onShopNameSuggestion(suggestShopNameFromPlace(place));
    }

    setSearchQuery(place.display_name);
    setSearchOpen(false);
    setSearchResults([]);
  }

  const statusStyles =
    status?.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
      : status?.tone === "error"
        ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        : status?.tone === "loading"
          ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
          : "";

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950/80">
      <div>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Shop GPS location</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Search an address, use your current location, or enter coordinates manually. Staff clock-in still uses
          the same radius validation.
        </p>
      </div>

      <div ref={searchWrapRef} className="relative">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Search place or address
          <input
            type="search"
            className={inputClass}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setStatus(null);
            }}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            placeholder="e.g. Silverlakes Batu Gajah"
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={searchOpen}
          />
        </label>
        {searchLoading ? (
          <p className="mt-1 text-xs text-zinc-500">Searching OpenStreetMap…</p>
        ) : null}
        {searchOpen && searchResults.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
            {searchResults.map((place) => (
              <li key={place.place_id} role="option">
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => selectPlace(place)}
                >
                  <span className="line-clamp-2 text-zinc-900 dark:text-zinc-50">{place.display_name}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-zinc-500">
                    {place.lat}, {place.lon}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <button
        type="button"
        disabled={gpsLoading}
        onClick={() => void useCurrentLocation()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {gpsLoading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-800 dark:border-t-zinc-100" />
            Getting location…
          </>
        ) : (
          "Use current location"
        )}
      </button>

      {status ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${statusStyles}`}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Latitude
          <input
            type="number"
            step="any"
            inputMode="decimal"
            className={inputClass}
            value={form.latitude}
            onChange={(e) => onChange({ ...form, latitude: e.target.value })}
            placeholder="e.g. 4.123456"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Longitude
          <input
            type="number"
            step="any"
            inputMode="decimal"
            className={inputClass}
            value={form.longitude}
            onChange={(e) => onChange({ ...form, longitude: e.target.value })}
            placeholder="e.g. 101.123456"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Allowed radius (m)
          <input
            type="number"
            min={1}
            inputMode="numeric"
            className={inputClass}
            value={form.allowed_radius_meters}
            onChange={(e) => onChange({ ...form, allowed_radius_meters: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
