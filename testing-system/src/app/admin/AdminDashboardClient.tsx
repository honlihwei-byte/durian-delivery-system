"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { SessionLogoutButton } from "@/components/SessionLogoutButton";
import { SiteHeader } from "@/components/SiteHeader";
import {
  getDashboardAlerts,
  getDailyReportRows,
  getDriverById,
  getDriverProgress,
  getDrivers,
  getActiveDrivers,
  getOrdersForDriver,
  getOrdersForDriverOnRoute,
  getOrdersForRoute,
  getRouteAnalyticsRows,
  getRouteProgress,
  getRoutesForDriver,
  getStopHistorySummary,
  getStopMasters,
  getStopTimeMetrics,
} from "@/lib/delivery-dashboard";
import {
  assignRouteGroupToDriver,
  assignRouteToDriver,
  assignSavedStopToDriver,
  assignStopToDriver,
  createDriverAccount,
  createStopMaster,
  getDeliveryStoreSnapshot,
  resetDeliveryStore,
  updateDriverAccount,
  updateStopMaster,
} from "@/lib/delivery-demo-storage";
import { getCurrentSession, isAdminSession } from "@/lib/demo-session";
import {
  DELIVERY_STATUS_LABEL,
  ROUTE_STATUS_LABEL,
  type DeliveryStatus,
  type DeliveryStore,
  type DriverRow,
} from "@/types/delivery";

type AdminTabId = "overview" | "assign" | "master" | "performance" | "settings";

type StopFormState = {
  customerName: string;
  area: string;
  address: string;
  contactNumber: string;
  googleMapsLink: string;
  latitude: string;
  longitude: string;
  defaultRouteGroup: string;
  notes: string;
};

const ADMIN_TABS: Array<{ id: AdminTabId; label: string; blurb: string }> = [
  { id: "overview", label: "Overview", blurb: "Today at a glance" },
  { id: "assign", label: "Assign Route", blurb: "Driver + date assignment" },
  { id: "master", label: "Stop Master", blurb: "Saved customer stops" },
  { id: "performance", label: "Driver Performance", blurb: "Ranking and alerts" },
  { id: "settings", label: "Settings", blurb: "Accounts and demo tools" },
];

type DriverFormState = {
  name: string;
  username: string;
  password: string;
  phone: string;
  vehicle: string;
  zone: string;
  shiftStart: string;
  shiftEnd: string;
  isActive: boolean;
};

const EMPTY_DRIVER_FORM: DriverFormState = {
  name: "",
  username: "",
  password: "",
  phone: "",
  vehicle: "",
  zone: "",
  shiftStart: "08:00",
  shiftEnd: "17:00",
  isActive: true,
};

const EMPTY_STOP_FORM: StopFormState = {
  customerName: "",
  area: "",
  address: "",
  contactNumber: "",
  googleMapsLink: "",
  latitude: "",
  longitude: "",
  defaultRouteGroup: "",
  notes: "",
};

function formatDateTime(value: string | null) {
  if (!value) return "Not yet";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatMinutes(value: number | null) {
  if (value === null) return "N/A";
  return `${value} min`;
}

function statusClasses(status: DeliveryStatus) {
  if (status === "delivered") return "bg-emerald-100 text-emerald-700";
  if (status === "arrived") return "bg-amber-100 text-amber-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function alertTone(severity: "high" | "medium" | "low") {
  if (severity === "high") return "border-red-200 bg-red-50 text-red-800";
  if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function driverStatusLabel(progress: ReturnType<typeof getDriverProgress>) {
  if (progress.routeCount === 0) return "No assignment";
  if (progress.activeStops === 0 && progress.totalStops > 0) return "Completed";
  if (progress.startedAt) return "On route";
  return "Assigned";
}

function matchStopQuery(
  stop: {
    customerName: string;
    area: string;
    address: string;
    contactNumber: string;
    defaultRouteGroup: string;
    notes: string;
    googleMapsLink: string | null;
  },
  query: string
) {
  return [
    stop.customerName,
    stop.area,
    stop.address,
    stop.contactNumber,
    stop.defaultRouteGroup,
    stop.notes,
    stop.googleMapsLink ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function stopFormFromMaster(stop: {
  customerName: string;
  area: string;
  address: string;
  contactNumber: string;
  googleMapsLink: string | null;
  latitude: number | null;
  longitude: number | null;
  defaultRouteGroup: string;
  notes: string;
}): StopFormState {
  return {
    customerName: stop.customerName,
    area: stop.area,
    address: stop.address,
    contactNumber: stop.contactNumber,
    googleMapsLink: stop.googleMapsLink ?? "",
    latitude: stop.latitude === null ? "" : `${stop.latitude}`,
    longitude: stop.longitude === null ? "" : `${stop.longitude}`,
    defaultRouteGroup: stop.defaultRouteGroup,
    notes: stop.notes,
  };
}

function rankingScore(row: {
  delivered: number;
  completionPercent: number;
  failed: number;
  averageDeliveryMinutes: number | null;
  totalIdleMinutes: number;
}) {
  return (
    row.delivered * 1000 +
    row.completionPercent * 10 -
    row.failed * 50 -
    (row.averageDeliveryMinutes ?? 999) -
    row.totalIdleMinutes
  );
}

function SectionShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-drive-line bg-drive-surface p-4 shadow-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-drive-muted">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold text-drive-ink">{title}</h2>
      {description ? <p className="mt-2 text-sm text-drive-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "default" | "success" | "danger";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "danger"
        ? "text-red-700"
        : "text-drive-ink";

  return (
    <div className="rounded-2xl border border-drive-line bg-drive-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-drive-muted">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-sm text-drive-muted">{hint}</p>
    </div>
  );
}

export function AdminDashboardClient() {
  const router = useRouter();
  const [store, setStore] = useState<DeliveryStore | null>(null);
  const [checked, setChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
  const [error, setError] = useState<string | null>(null);
  const [driverForm, setDriverForm] = useState<DriverFormState>(EMPTY_DRIVER_FORM);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [assignmentStopForm, setAssignmentStopForm] = useState<StopFormState>(EMPTY_STOP_FORM);
  const [masterForm, setMasterForm] = useState<StopFormState>(EMPTY_STOP_FORM);
  const [editingStopMasterId, setEditingStopMasterId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
  const [assignmentDate, setAssignmentDate] = useState("");
  const [routeGroupDraft, setRouteGroupDraft] = useState("");
  const [assignStopSearch, setAssignStopSearch] = useState("");
  const [masterSearch, setMasterSearch] = useState("");
  const [busyRouteId, setBusyRouteId] = useState<string | null>(null);
  const [busyStopId, setBusyStopId] = useState<string | null>(null);
  const [busyActionKey, setBusyActionKey] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      const session = getCurrentSession();
      if (!isAdminSession(session)) {
        router.replace("/login?role=admin&next=/admin");
        return;
      }

      const nextStore = getDeliveryStoreSnapshot(session.companyId);
      setStore(nextStore);
      setSelectedDriverId((current) => current ?? nextStore?.drivers[0]?.id ?? null);
      setSelectedMasterId((current) => current ?? nextStore?.stopMasters[0]?.id ?? null);
      setAssignmentDate((current) => current || nextStore?.routeDate || "");
      setRouteGroupDraft((current) => current || nextStore?.stopMasters[0]?.defaultRouteGroup || "");
      setChecked(true);
    };

    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [router]);

  const todayDate = store?.routeDate ?? "";
  const drivers = useMemo(() => (store ? getDrivers(store) : []), [store]);
  const activeDrivers = useMemo(() => (store ? getActiveDrivers(store) : []), [store]);
  const assignmentDriverOptions = useMemo(() => {
    if (!store) return [];
    const base = activeDrivers.length ? activeDrivers : drivers;
    if (!selectedDriverId) return base;
    const sel = store.drivers.find((d) => d.id === selectedDriverId);
    if (sel && !sel.isActive && !base.some((d) => d.id === sel.id)) {
      return [...base, sel].sort((a, b) => a.name.localeCompare(b.name));
    }
    return base;
  }, [store, activeDrivers, drivers, selectedDriverId]);
  const alerts = useMemo(() => (store ? getDashboardAlerts(store, todayDate) : []), [store, todayDate]);
  const reportRows = useMemo(() => (store ? getDailyReportRows(store, todayDate) : []), [store, todayDate]);
  const routeAnalytics = useMemo(
    () => (store ? getRouteAnalyticsRows(store, todayDate) : []),
    [store, todayDate]
  );

  const fleetAvgDelivery = useMemo(() => {
    if (!reportRows.length) return null;
    const vals = reportRows
      .map((r) => r.averageDeliveryMinutes)
      .filter((v): v is number => v != null && v > 0);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [reportRows]);

  const totals = useMemo(() => {
    if (!store) {
      return { routes: 0, savedStops: 0, todayStops: 0, delivered: 0, failed: 0 };
    }

    const todaysStops = store.orders.filter((order) => order.routeDate === todayDate);
    return {
      routes: store.routes.filter((route) => route.routeDate === todayDate).length,
      savedStops: store.stopMasters.length,
      todayStops: todaysStops.length,
      delivered: todaysStops.filter((order) => order.status === "delivered").length,
      failed: todaysStops.filter((order) => order.status === "failed").length,
    };
  }, [store, todayDate]);

  const routeGroups = useMemo(() => {
    if (!store) return [];
    return Array.from(new Set(store.stopMasters.map((stop) => stop.defaultRouteGroup))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [store]);

  const filteredAssignableStops = useMemo(() => {
    if (!store) return [];
    const query = assignStopSearch.trim().toLowerCase();
    const stops = getStopMasters(store);
    if (!query) return stops;
    return stops.filter((stop) => matchStopQuery(stop, query));
  }, [assignStopSearch, store]);

  const filteredMasterStops = useMemo(() => {
    if (!store) return [];
    const query = masterSearch.trim().toLowerCase();
    const stops = getStopMasters(store);
    if (!query) return stops;
    return stops.filter((stop) => matchStopQuery(stop, query));
  }, [masterSearch, store]);

  const rankingRows = useMemo(() => {
    return [...reportRows].sort((a, b) => rankingScore(b) - rankingScore(a));
  }, [reportRows]);

  const selectedDriver =
    drivers.find((driver) => driver.id === selectedDriverId) ?? drivers[0] ?? null;
  const selectedDriverProgress =
    store && selectedDriver ? getDriverProgress(store, selectedDriver.id, assignmentDate || todayDate) : null;
  const selectedDriverRoutes =
    store && selectedDriver ? getRoutesForDriver(store, selectedDriver.id, assignmentDate || todayDate) : [];
  const selectedDriverOrders =
    store && selectedDriver ? getOrdersForDriver(store, selectedDriver.id, assignmentDate || todayDate) : [];

  useEffect(() => {
    if (!store || !selectedDriverId) return;
    const driver = store.drivers.find((d) => d.id === selectedDriverId);
    if (!driver || driver.isActive) return;
    const activeId = store.drivers.find((d) => d.companyId === driver.companyId && d.isActive)?.id;
    if (activeId && activeId !== selectedDriverId) {
      setSelectedDriverId(activeId);
    }
  }, [store, selectedDriverId]);

  const selectedMaster =
    filteredMasterStops.find((stop) => stop.id === selectedMasterId) ??
    store?.stopMasters.find((stop) => stop.id === selectedMasterId) ??
    filteredMasterStops[0] ??
    null;
  const selectedMasterHistory =
    store && selectedMaster ? getStopHistorySummary(store, selectedMaster.id) : null;

  useEffect(() => {
    if (!selectedMaster && filteredMasterStops.length === 0) return;
    if (!selectedMasterId && filteredMasterStops[0]) {
      setSelectedMasterId(filteredMasterStops[0].id);
      return;
    }
    if (selectedMasterId && !filteredMasterStops.some((stop) => stop.id === selectedMasterId) && filteredMasterStops[0]) {
      setSelectedMasterId(filteredMasterStops[0].id);
    }
  }, [filteredMasterStops, selectedMaster, selectedMasterId]);

  function updateDriverField<K extends keyof DriverFormState>(field: K, value: DriverFormState[K]) {
    setDriverForm((current) => ({ ...current, [field]: value }));
  }

  function beginEditDriver(driver: DriverRow) {
    setEditingDriverId(driver.id);
    setDriverForm({
      name: driver.name,
      username: driver.username,
      password: "",
      phone: driver.phone,
      vehicle: driver.vehicle,
      zone: driver.zone,
      shiftStart: driver.shiftStart,
      shiftEnd: driver.shiftEnd,
      isActive: driver.isActive,
    });
    setError(null);
  }

  function cancelDriverEdit() {
    setEditingDriverId(null);
    setDriverForm(EMPTY_DRIVER_FORM);
  }

  function updateAssignmentStopField(field: keyof StopFormState, value: string) {
    setAssignmentStopForm((current) => ({ ...current, [field]: value }));
  }

  function updateMasterField(field: keyof StopFormState, value: string) {
    setMasterForm((current) => ({ ...current, [field]: value }));
  }

  function handleDriverFormSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const session = getCurrentSession();
    if (!isAdminSession(session)) return;

    if (editingDriverId) {
      const result = updateDriverAccount(session.companyId, editingDriverId, driverForm);
      if (!result.ok) {
        setError(result.error);
        if (result.store) setStore(result.store);
        return;
      }
      setStore(result.store);
      cancelDriverEdit();
      return;
    }

    const result = createDriverAccount(session.companyId, driverForm);
    if (!result.ok) {
      setError(result.error);
      if (result.store) setStore(result.store);
      return;
    }
    setStore(result.store);
    setDriverForm(EMPTY_DRIVER_FORM);
  }

  function handleResetDay() {
    setError(null);
    const session = getCurrentSession();
    if (!isAdminSession(session)) return;
    resetDeliveryStore();
    const next = getDeliveryStoreSnapshot(session.companyId);
    setStore(next);
    setSelectedDriverId(next?.drivers[0]?.id ?? null);
    setSelectedMasterId(next?.stopMasters[0]?.id ?? null);
    setAssignmentDate(next?.routeDate ?? "");
    setRouteGroupDraft(next?.stopMasters[0]?.defaultRouteGroup ?? "");
    setAssignmentStopForm(EMPTY_STOP_FORM);
    setMasterForm(EMPTY_STOP_FORM);
    setEditingStopMasterId(null);
    setEditingDriverId(null);
    setDriverForm(EMPTY_DRIVER_FORM);
  }

  function handleAssignRoute(routeId: string, driverId: string) {
    setError(null);
    const session = getCurrentSession();
    if (!isAdminSession(session)) return;
    setBusyRouteId(routeId);
    const result = assignRouteToDriver(session.companyId, routeId, driverId || null);
    setBusyRouteId(null);
    if (!result.ok) {
      setError(result.error);
      if (result.store) setStore(result.store);
      return;
    }
    setStore(result.store);
  }

  function handleAssignStop(orderId: string, driverId: string) {
    setError(null);
    const session = getCurrentSession();
    if (!isAdminSession(session)) return;
    setBusyStopId(orderId);
    const result = assignStopToDriver(session.companyId, orderId, driverId || null);
    setBusyStopId(null);
    if (!result.ok) {
      setError(result.error);
      if (result.store) setStore(result.store);
      return;
    }
    setStore(result.store);
  }

  function handleAssignSavedStop(stopMasterId: string) {
    if (!selectedDriverId) return;
    setError(null);
    const session = getCurrentSession();
    if (!isAdminSession(session)) return;
    setBusyActionKey(`saved-stop-${stopMasterId}`);
    const result = assignSavedStopToDriver({
      companyId: session.companyId,
      stopMasterId,
      driverId: selectedDriverId,
      routeDate: assignmentDate || todayDate,
    });
    setBusyActionKey(null);
    if (!result.ok) {
      setError(result.error);
      if (result.store) setStore(result.store);
      return;
    }
    setStore(result.store);
  }

  function handleAssignRouteGroup() {
    if (!selectedDriverId) return;
    setError(null);
    const session = getCurrentSession();
    if (!isAdminSession(session)) return;
    setBusyActionKey("assign-route-group");
    const result = assignRouteGroupToDriver({
      companyId: session.companyId,
      routeGroup: routeGroupDraft,
      driverId: selectedDriverId,
      routeDate: assignmentDate || todayDate,
    });
    setBusyActionKey(null);
    if (!result.ok) {
      setError(result.error);
      if (result.store) setStore(result.store);
      return;
    }
    setStore(result.store);
  }

  function handleCreateStopAndMaybeAssign(assignAfterSave: boolean) {
    setError(null);
    const session = getCurrentSession();
    if (!isAdminSession(session)) return;
    setBusyActionKey(assignAfterSave ? "create-stop-assign" : "create-stop");
    const created = createStopMaster(session.companyId, assignmentStopForm);
    if (!created.ok) {
      setBusyActionKey(null);
      setError(created.error);
      if (created.store) setStore(created.store);
      return;
    }

    let nextStore = created.store;
    if (assignAfterSave && selectedDriverId) {
      const assigned = assignSavedStopToDriver({
        companyId: session.companyId,
        stopMasterId: created.stopMasterId,
        driverId: selectedDriverId,
        routeDate: assignmentDate || todayDate,
      });
      if (!assigned.ok) {
        setBusyActionKey(null);
        setError(assigned.error);
        if (assigned.store) setStore(assigned.store);
        return;
      }
      nextStore = assigned.store;
    }

    setBusyActionKey(null);
    setStore(nextStore);
    setSelectedMasterId(created.stopMasterId);
    setActiveTab(assignAfterSave ? "assign" : "master");
    setAssignmentStopForm(EMPTY_STOP_FORM);
  }

  function handleStartEditStop() {
    if (!selectedMaster) return;
    setEditingStopMasterId(selectedMaster.id);
    setMasterForm(stopFormFromMaster(selectedMaster));
  }

  function handleCancelEditStop() {
    setEditingStopMasterId(null);
    setMasterForm(EMPTY_STOP_FORM);
  }

  function handleSaveMasterForm() {
    setError(null);
    const session = getCurrentSession();
    if (!isAdminSession(session)) return;
    const isEditing = Boolean(editingStopMasterId);
    setBusyActionKey(isEditing ? "update-stop-master" : "create-stop-master");

    const result = editingStopMasterId
      ? updateStopMaster(session.companyId, editingStopMasterId, masterForm)
      : createStopMaster(session.companyId, masterForm);

    setBusyActionKey(null);
    if (!result.ok) {
      setError(result.error);
      if (result.store) setStore(result.store);
      return;
    }

    setStore(result.store);
    setSelectedMasterId(result.stopMasterId);
    setEditingStopMasterId(null);
    setMasterForm(EMPTY_STOP_FORM);
  }

  const session = getCurrentSession();
  if (!isAdminSession(session)) {
    return <p className="text-sm text-drive-muted">Redirecting to login…</p>;
  }

  if (!checked || !store) {
    return (
      <div className="min-h-screen bg-drive-bg">
        <SiteHeader
          title="Driver Delivery Check-in"
          subtitle={`${session.companyName} · ${session.companyCode}`}
          right={
            <div className="flex items-center gap-2">
              <Link
                href="/login?role=driver"
                className="rounded-lg border border-drive-line px-3 py-2 text-sm font-medium text-drive-ink hover:bg-drive-bg"
              >
                Driver login
              </Link>
              <AdminLogoutButton />
            </div>
          }
        />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <p className="text-sm text-drive-muted">Loading dashboard…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drive-bg">
      <SiteHeader
        title="Driver Delivery Check-in"
        subtitle={`${session.companyName} · ${session.companyCode} · Admin`}
        right={
          <div className="flex items-center gap-2">
            <Link
              href="/login?role=driver"
              className="rounded-lg border border-drive-line px-3 py-2 text-sm font-medium text-drive-ink hover:bg-drive-bg"
            >
              Driver login
            </Link>
            <AdminLogoutButton />
          </div>
        }
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <div className="space-y-5">
      <section className="rounded-2xl border border-drive-line bg-drive-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-drive-muted">Admin dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold text-drive-ink">Delivery operations control panel</h1>
            <p className="mt-2 max-w-3xl text-sm text-drive-muted">
              Switch between focused tabs instead of one long page. Each tab shows a single job area: overview, assignment, stop master, performance, or settings.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl border border-drive-line bg-drive-bg px-3 py-3">
              <p className="text-[11px] uppercase text-drive-muted">Active drivers</p>
              <p className="mt-1 text-lg font-semibold text-drive-ink">{activeDrivers.length}</p>
            </div>
            <div className="rounded-2xl border border-drive-line bg-drive-bg px-3 py-3">
              <p className="text-[11px] uppercase text-drive-muted">Today&apos;s routes</p>
              <p className="mt-1 text-lg font-semibold text-drive-ink">{totals.routes}</p>
            </div>
            <div className="rounded-2xl border border-drive-line bg-drive-bg px-3 py-3">
              <p className="text-[11px] uppercase text-drive-muted">Saved stops</p>
              <p className="mt-1 text-lg font-semibold text-drive-ink">{totals.savedStops}</p>
            </div>
            <div className="rounded-2xl border border-drive-line bg-drive-bg px-3 py-3">
              <p className="text-[11px] uppercase text-drive-muted">Delivered</p>
              <p className="mt-1 text-lg font-semibold text-emerald-700">{totals.delivered}</p>
            </div>
            <div className="rounded-2xl border border-drive-line bg-drive-bg px-3 py-3">
              <p className="text-[11px] uppercase text-drive-muted">Avg stop time</p>
              <p className="mt-1 text-lg font-semibold text-drive-ink">{formatMinutes(fleetAvgDelivery)}</p>
            </div>
            <div className="rounded-2xl border border-drive-line bg-drive-bg px-3 py-3">
              <p className="text-[11px] uppercase text-drive-muted">Exceptions</p>
              <p className="mt-1 text-lg font-semibold text-red-700">{alerts.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setError(null);
                  setActiveTab(tab.id);
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  activeTab === tab.id
                    ? "border-drive-accent bg-emerald-50 text-drive-ink ring-2 ring-drive-accent/25"
                    : "border-drive-line bg-white text-drive-muted hover:border-drive-accent/50 hover:text-drive-ink"
                }`}
              >
                <p className="text-sm font-semibold">{tab.label}</p>
                <p className="mt-1 text-xs">{tab.blurb}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {activeTab === "overview" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Active drivers"
              value={activeDrivers.length}
              hint="Signed-in ready crew for this tenant"
            />
            <MetricCard label="Routes today" value={totals.routes} hint="Distinct route sheets for the date" />
            <MetricCard label="Assigned stops" value={totals.todayStops} hint="Stops on today’s manifests" />
            <MetricCard label="Completed" value={totals.delivered} hint="Delivered today" tone="success" />
            <MetricCard
              label="Avg delivery time"
              value={formatMinutes(fleetAvgDelivery)}
              hint="Fleet mean arrival→delivery (today)"
            />
            <MetricCard label="Exceptions" value={alerts.length} hint="SLA risk & follow-ups" tone="danger" />
          </div>

          <SectionShell
            eyebrow="Overview"
            title="Today’s driver cards"
            description="Tap a driver card to jump into the assignment tab with that driver selected."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {drivers.map((driver) => {
                const progress = getDriverProgress(store, driver.id, todayDate);
                const isSelected = selectedDriver?.id === driver.id;
                return (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => {
                      setSelectedDriverId(driver.id);
                      setActiveTab("assign");
                    }}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                      isSelected
                        ? "border-drive-accent bg-emerald-50 ring-2 ring-drive-accent/25"
                        : "border-drive-line bg-drive-bg hover:border-drive-accent/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-drive-ink">{driver.name}</h3>
                        <p className="text-sm text-drive-muted">
                          {driver.vehicle} · {driver.zone}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {!driver.isActive ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                            Inactive
                          </span>
                        ) : null}
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-drive-ink">
                          {driverStatusLabel(progress)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[11px] uppercase text-drive-muted">Assigned</p>
                        <p className="mt-1 font-semibold text-drive-ink">{progress.totalStops}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[11px] uppercase text-drive-muted">Delivered</p>
                        <p className="mt-1 font-semibold text-emerald-700">{progress.delivered}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[11px] uppercase text-drive-muted">Failed</p>
                        <p className="mt-1 font-semibold text-red-700">{progress.failed}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[11px] uppercase text-drive-muted">Avg delivery</p>
                        <p className="mt-1 font-semibold text-drive-ink">{formatMinutes(progress.averageDeliveryMinutes)}</p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-drive-line">
                      <div
                        className="h-full rounded-full bg-drive-accent"
                        style={{ width: `${progress.completionPercent}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-drive-muted">
                      {progress.completionPercent}% progress · Last update {formatDateTime(progress.lastEventAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          </SectionShell>

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionShell
              eyebrow="Overview"
              title="Route progress"
              description="Use this to spot which route groups are ahead, delayed, or harder than normal."
            >
              <div className="space-y-3">
                {routeAnalytics.map((route) => {
                  const routeRow = store.routes.find((item) => item.id === route.routeId) ?? null;
                  const progress = getRouteProgress(store, route.routeId);
                  return (
                    <div key={route.routeId} className="rounded-2xl border border-drive-line bg-drive-bg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-drive-ink">{route.routeName}</p>
                          <p className="mt-1 text-xs text-drive-muted">
                            {progress.totalStops} stops · {progress.completionPercent}% completed
                          </p>
                          <p className="mt-1 text-xs text-drive-muted">
                            Avg stop {formatMinutes(route.averageStopMinutes)} · Avg delay {formatMinutes(route.averageDelayMinutes)}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-drive-ink">
                          {routeRow ? ROUTE_STATUS_LABEL[routeRow.status] : "Unknown"}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-drive-accent"
                          style={{ width: `${progress.completionPercent}%` }}
                        />
                      </div>
                      <p className="mt-3 text-xs text-drive-muted">
                        Driver {routeRow?.assignedDriverId ? getDriverById(store, routeRow.assignedDriverId)?.name ?? "Unknown" : "Unassigned"} ·
                        Last update {formatDateTime(route.lastUpdateAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </SectionShell>

            <SectionShell
              eyebrow="Overview"
              title="Exceptions"
              description="SLA risks, failed stops, long dwell times, and stale GPS — prioritized for dispatch."
            >
              <div className="space-y-3">
                {alerts.length ? (
                  alerts.map((alert) => {
                    const alertDriver = getDriverById(store, alert.driverId);
                    return (
                      <div key={alert.id} className={`rounded-xl border px-3 py-3 text-sm ${alertTone(alert.severity)}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{alert.title}</p>
                            <p className="mt-1 leading-relaxed">{alert.description}</p>
                            <p className="mt-1 text-xs opacity-80">{alertDriver?.name ?? "Unassigned"}</p>
                          </div>
                          <span className="shrink-0 text-xs font-medium">{formatDateTime(alert.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-xl border border-dashed border-drive-line bg-drive-bg px-3 py-4 text-sm text-drive-muted">
                    No abnormal alerts right now.
                  </p>
                )}
              </div>
            </SectionShell>
          </div>
        </div>
      ) : null}

      {activeTab === "assign" ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <SectionShell
              eyebrow="Assign Route"
              title="Select driver and date"
              description="Choose a driver first, then assign saved stops or create a new stop and assign it immediately."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <label className="rounded-2xl border border-drive-line bg-drive-bg p-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-drive-muted">Driver</span>
                  <select
                    value={selectedDriver?.id ?? ""}
                    onChange={(event) => setSelectedDriverId(event.target.value || null)}
                    className="mt-2 w-full rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                  >
                    {assignmentDriverOptions.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                        {!driver.isActive ? " (inactive)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rounded-2xl border border-drive-line bg-drive-bg p-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-drive-muted">Assignment date</span>
                  <input
                    type="date"
                    value={assignmentDate}
                    onChange={(event) => setAssignmentDate(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                  />
                </label>
              </div>

              {selectedDriver && selectedDriverProgress ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-drive-bg p-3">
                    <p className="text-[11px] uppercase text-drive-muted">Routes</p>
                    <p className="mt-1 font-semibold text-drive-ink">{selectedDriverRoutes.length}</p>
                  </div>
                  <div className="rounded-xl bg-drive-bg p-3">
                    <p className="text-[11px] uppercase text-drive-muted">Stops</p>
                    <p className="mt-1 font-semibold text-drive-ink">{selectedDriverOrders.length}</p>
                  </div>
                  <div className="rounded-xl bg-drive-bg p-3">
                    <p className="text-[11px] uppercase text-drive-muted">Progress</p>
                    <p className="mt-1 font-semibold text-drive-ink">{selectedDriverProgress.completionPercent}%</p>
                  </div>
                  <div className="rounded-xl bg-drive-bg p-3">
                    <p className="text-[11px] uppercase text-drive-muted">Last update</p>
                    <p className="mt-1 text-xs font-semibold text-drive-ink">
                      {formatDateTime(selectedDriverProgress.lastEventAt)}
                    </p>
                  </div>
                </div>
              ) : null}
            </SectionShell>

            <SectionShell
              eyebrow="Assign Route"
              title="Add saved stop"
              description="Search reusable stops, then add them to the selected driver for the selected date."
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-drive-muted">Search</span>
                  <input
                    value={assignStopSearch}
                    onChange={(event) => setAssignStopSearch(event.target.value)}
                    placeholder="Search customer, route group, address, contact..."
                    className="mt-2 w-full rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                  />
                </label>
                <label className="sm:w-64">
                  <span className="text-xs font-semibold uppercase tracking-wide text-drive-muted">Route group</span>
                  <div className="mt-2 flex gap-2">
                    <select
                      value={routeGroupDraft}
                      onChange={(event) => setRouteGroupDraft(event.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                    >
                      <option value="">Select route group</option>
                      {routeGroups.map((routeGroup) => (
                        <option key={routeGroup} value={routeGroup}>
                          {routeGroup}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedDriver || !routeGroupDraft || busyActionKey === "assign-route-group"}
                      onClick={handleAssignRouteGroup}
                      className="rounded-xl bg-drive-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-drive-accentMuted disabled:opacity-60"
                    >
                      {busyActionKey === "assign-route-group" ? "Assigning..." : "Bulk"}
                    </button>
                  </div>
                </label>
              </div>

              <div className="mt-4 space-y-3">
                {filteredAssignableStops.slice(0, 8).map((stop) => (
                  <div key={stop.id} className="rounded-2xl border border-drive-line bg-drive-bg p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-drive-ink">{stop.customerName}</p>
                        <p className="mt-1 text-xs text-drive-muted">
                          {stop.area} · {stop.defaultRouteGroup}
                        </p>
                        <p className="mt-1 text-xs text-drive-muted">{stop.address}</p>
                        <p className="mt-1 text-xs text-drive-muted">
                          {stop.contactNumber}
                          {stop.googleMapsLink ? " · Map saved" : " · Address fallback"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!selectedDriver || busyActionKey === `saved-stop-${stop.id}`}
                        onClick={() => handleAssignSavedStop(stop.id)}
                        className="rounded-xl border border-drive-line bg-white px-3 py-2 text-xs font-semibold text-drive-ink hover:bg-drive-surface disabled:opacity-60"
                      >
                        {busyActionKey === `saved-stop-${stop.id}` ? "Assigning..." : "Assign Stop"}
                      </button>
                    </div>
                  </div>
                ))}
                {filteredAssignableStops.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-drive-line bg-drive-bg px-3 py-4 text-sm text-drive-muted">
                    No saved stops match your search.
                  </p>
                ) : null}
              </div>
            </SectionShell>

            <SectionShell
              eyebrow="Assign Route"
              title="Add new stop"
              description="Create a brand-new stop master here, then assign it to the selected driver immediately if needed."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={assignmentStopForm.customerName}
                  onChange={(event) => updateAssignmentStopField("customerName", event.target.value)}
                  placeholder="Customer name"
                  className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
                <input
                  value={assignmentStopForm.area}
                  onChange={(event) => updateAssignmentStopField("area", event.target.value)}
                  placeholder="Area"
                  className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
                <input
                  value={assignmentStopForm.contactNumber}
                  onChange={(event) => updateAssignmentStopField("contactNumber", event.target.value)}
                  placeholder="Contact number"
                  className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
                <input
                  value={assignmentStopForm.defaultRouteGroup}
                  onChange={(event) => updateAssignmentStopField("defaultRouteGroup", event.target.value)}
                  placeholder="Default route group"
                  className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
                <input
                  value={assignmentStopForm.googleMapsLink}
                  onChange={(event) => updateAssignmentStopField("googleMapsLink", event.target.value)}
                  placeholder="Google Maps link"
                  className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={assignmentStopForm.latitude}
                    onChange={(event) => updateAssignmentStopField("latitude", event.target.value)}
                    placeholder="Latitude"
                    className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                  />
                  <input
                    value={assignmentStopForm.longitude}
                    onChange={(event) => updateAssignmentStopField("longitude", event.target.value)}
                    placeholder="Longitude"
                    className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                  />
                </div>
                <textarea
                  rows={3}
                  value={assignmentStopForm.address}
                  onChange={(event) => updateAssignmentStopField("address", event.target.value)}
                  placeholder="Address"
                  className="md:col-span-2 rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
                <textarea
                  rows={3}
                  value={assignmentStopForm.notes}
                  onChange={(event) => updateAssignmentStopField("notes", event.target.value)}
                  placeholder="Notes"
                  className="md:col-span-2 rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyActionKey === "create-stop"}
                  onClick={() => handleCreateStopAndMaybeAssign(false)}
                  className="rounded-xl border border-drive-line bg-white px-4 py-2.5 text-sm font-semibold text-drive-ink hover:bg-drive-surface disabled:opacity-60"
                >
                  {busyActionKey === "create-stop" ? "Saving..." : "Save Stop"}
                </button>
                <button
                  type="button"
                  disabled={!selectedDriver || busyActionKey === "create-stop-assign"}
                  onClick={() => handleCreateStopAndMaybeAssign(true)}
                  className="rounded-xl bg-drive-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-drive-accentMuted disabled:opacity-60"
                >
                  {busyActionKey === "create-stop-assign" ? "Saving..." : "Save + Assign"}
                </button>
              </div>
            </SectionShell>
          </div>

          <SectionShell
            eyebrow="Assign Route"
            title={selectedDriver ? `${selectedDriver.name}'s assignments` : "Assignments"}
            description="Only the selected driver and date are shown here so assignment changes are shorter and easier to read."
          >
            {selectedDriverRoutes.length ? (
              <div className="space-y-4">
                {selectedDriverRoutes.map((route) => {
                  const routeStops = getOrdersForDriverOnRoute(store, selectedDriver!.id, route.id);
                  const routeProgress = getRouteProgress(store, route.id);
                  return (
                    <article key={route.id} className="rounded-2xl border border-drive-line bg-drive-bg p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-drive-ink">{route.routeName}</h3>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-drive-ink">
                              {ROUTE_STATUS_LABEL[route.status]}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-drive-muted">
                            {route.routeDate} · {routeStops.length} assigned stop{routeStops.length === 1 ? "" : "s"} ·{" "}
                            {routeProgress.completionPercent}% progress
                          </p>
                        </div>
                        <select
                          value={route.assignedDriverId ?? ""}
                          disabled={busyRouteId === route.id}
                          onChange={(event) => handleAssignRoute(route.id, event.target.value)}
                          className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm font-medium text-drive-ink outline-none ring-drive-accent/30 focus:ring-2"
                        >
                          <option value="">Unassign route</option>
                          {drivers.map((driver) => (
                            <option
                              key={driver.id}
                              value={driver.id}
                              disabled={!driver.isActive && route.assignedDriverId !== driver.id}
                            >
                              {driver.name}
                              {!driver.isActive ? " (inactive)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-4 space-y-2">
                        {routeStops.map((order) => {
                          const metrics = getStopTimeMetrics(order);
                          return (
                            <div key={order.id} className="rounded-xl border border-drive-line bg-white px-3 py-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-drive-ink">
                                      Stop {order.stopNumber} · {order.customerName}
                                    </p>
                                    <span
                                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClasses(
                                        order.status
                                      )}`}
                                    >
                                      {DELIVERY_STATUS_LABEL[order.status]}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-drive-muted">
                                    {order.area} · {order.contactNumber}
                                  </p>
                                  <p className="mt-1 text-xs text-drive-muted">{order.address}</p>
                                  <p className="mt-2 text-xs text-drive-muted">
                                    Delivery {formatMinutes(metrics.arrivalToDeliveryMinutes)} · On-site{" "}
                                    {formatMinutes(metrics.totalTimeAtStopMinutes)} · Delay {formatMinutes(metrics.delayMinutes)}
                                  </p>
                                </div>
                                <select
                                  value={order.assignedDriverId ?? ""}
                                  disabled={busyStopId === order.id}
                                  onChange={(event) => handleAssignStop(order.id, event.target.value)}
                                  className="rounded-lg border border-drive-line bg-white px-3 py-2 text-sm font-medium text-drive-ink outline-none ring-drive-accent/30 focus:ring-2"
                                >
                                  <option value="">Unassign stop</option>
                                  {drivers.map((driver) => (
                                    <option
                                      key={driver.id}
                                      value={driver.id}
                                      disabled={!driver.isActive && order.assignedDriverId !== driver.id}
                                    >
                                      {driver.name}
                                      {!driver.isActive ? " (inactive)" : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-drive-line bg-drive-bg px-3 py-4 text-sm text-drive-muted">
                No routes or stops assigned to this driver on {assignmentDate || todayDate}.
              </p>
            )}
          </SectionShell>
        </div>
      ) : null}

      {activeTab === "master" ? (
        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <SectionShell
            eyebrow="Stop Master"
            title="Saved customer / stop list"
            description="Keep the reusable stop list short and searchable. Pick one stop to review history or edit details."
          >
            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-drive-muted">Search stop</span>
              <input
                value={masterSearch}
                onChange={(event) => setMasterSearch(event.target.value)}
                placeholder="Search customer, area, address, contact, route group..."
                className="mt-2 w-full rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
              />
            </label>

            <div className="mt-4 space-y-3">
              {filteredMasterStops.map((stop) => {
                const isSelected = selectedMaster?.id === stop.id;
                return (
                  <button
                    key={stop.id}
                    type="button"
                    onClick={() => setSelectedMasterId(stop.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-drive-accent bg-emerald-50 ring-2 ring-drive-accent/25"
                        : "border-drive-line bg-drive-bg hover:border-drive-accent/50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-drive-ink">{stop.customerName}</p>
                    <p className="mt-1 text-xs text-drive-muted">
                      {stop.area} · {stop.defaultRouteGroup}
                    </p>
                    <p className="mt-1 text-xs text-drive-muted">{stop.address}</p>
                    <p className="mt-1 text-xs text-drive-muted">
                      {stop.contactNumber} · {stop.googleMapsLink ? "Google Maps link saved" : "Address fallback"}
                    </p>
                  </button>
                );
              })}
              {filteredMasterStops.length === 0 ? (
                <p className="rounded-xl border border-dashed border-drive-line bg-drive-bg px-3 py-4 text-sm text-drive-muted">
                  No saved stops match the current search.
                </p>
              ) : null}
            </div>
          </SectionShell>

          <div className="space-y-5">
            <SectionShell
              eyebrow="Stop Master"
              title={selectedMaster ? selectedMaster.customerName : "Selected stop"}
              description="Review history here, then edit the saved stop details without leaving the tab."
            >
              {selectedMaster && selectedMasterHistory ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-drive-line bg-drive-bg p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-drive-ink">{selectedMasterHistory.customerName}</p>
                        <p className="mt-1 text-xs text-drive-muted">
                          {selectedMasterHistory.area} · {selectedMasterHistory.defaultRouteGroup}
                        </p>
                        <p className="mt-1 text-xs text-drive-muted">{selectedMasterHistory.address}</p>
                        <p className="mt-1 text-xs text-drive-muted">
                          {selectedMasterHistory.contactNumber}
                          {selectedMasterHistory.notes ? ` · ${selectedMasterHistory.notes}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-drive-muted">
                          {selectedMaster.googleMapsLink ? "Google Maps link saved" : "Address search fallback"} · Lat{" "}
                          {selectedMaster.latitude ?? "-"} · Lng {selectedMaster.longitude ?? "-"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleStartEditStop}
                          className="rounded-xl border border-drive-line bg-white px-3 py-2 text-xs font-semibold text-drive-ink hover:bg-drive-surface"
                        >
                          Edit Stop
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStopMasterId(null);
                            setMasterForm(EMPTY_STOP_FORM);
                          }}
                          className="rounded-xl border border-drive-line bg-white px-3 py-2 text-xs font-semibold text-drive-ink hover:bg-drive-surface"
                        >
                          New Stop
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-drive-bg p-3">
                      <p className="text-[11px] uppercase text-drive-muted">Visits</p>
                      <p className="mt-1 font-semibold text-drive-ink">{selectedMasterHistory.totalVisits}</p>
                    </div>
                    <div className="rounded-xl bg-drive-bg p-3">
                      <p className="text-[11px] uppercase text-drive-muted">Delivered</p>
                      <p className="mt-1 font-semibold text-emerald-700">{selectedMasterHistory.deliveredCount}</p>
                    </div>
                    <div className="rounded-xl bg-drive-bg p-3">
                      <p className="text-[11px] uppercase text-drive-muted">Failed</p>
                      <p className="mt-1 font-semibold text-red-700">{selectedMasterHistory.failedCount}</p>
                    </div>
                    <div className="rounded-xl bg-drive-bg p-3">
                      <p className="text-[11px] uppercase text-drive-muted">Avg unload</p>
                      <p className="mt-1 font-semibold text-drive-ink">
                        {formatMinutes(selectedMasterHistory.averageDeliveryMinutes)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-2xl border border-drive-line bg-drive-bg p-4">
                      <p className="text-sm font-semibold text-drive-ink">Recent delivery records</p>
                      <div className="mt-3 space-y-2">
                        {selectedMasterHistory.pastRecords.slice(0, 5).map((record) => (
                          <div key={record.orderId} className="rounded-xl border border-drive-line bg-white px-3 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-drive-ink">
                                {record.routeDate} · {record.driverName}
                              </p>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClasses(
                                  record.status
                                )}`}
                              >
                                {DELIVERY_STATUS_LABEL[record.status]}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-drive-muted">
                              {record.routeName} · Delivery {formatMinutes(record.arrivalToDeliveryMinutes)} · Delay{" "}
                              {formatMinutes(record.delayMinutes)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-drive-line bg-drive-bg p-4">
                      <p className="text-sm font-semibold text-drive-ink">Remarks and previous drivers</p>
                      <p className="mt-2 text-xs text-drive-muted">
                        Drivers delivered here before:{" "}
                        {selectedMasterHistory.driversDeliveredBefore.length
                          ? selectedMasterHistory.driversDeliveredBefore.join(", ")
                          : "No successful delivery yet"}
                      </p>
                      <div className="mt-3 space-y-2">
                        {selectedMasterHistory.remarksHistory.length ? (
                          selectedMasterHistory.remarksHistory.map((remark) => (
                            <div key={remark.id} className="rounded-xl border border-drive-line bg-white px-3 py-3">
                              <p className="text-xs font-semibold text-drive-ink">
                                {remark.routeDate} · {remark.driverName}
                              </p>
                              <p className="mt-1 text-xs text-drive-muted">{remark.remark}</p>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-xl border border-dashed border-drive-line bg-white px-3 py-4 text-xs text-drive-muted">
                            No remarks saved yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-drive-line bg-drive-bg px-3 py-4 text-sm text-drive-muted">
                  Select a saved stop to view details.
                </p>
              )}
            </SectionShell>

            <SectionShell
              eyebrow="Stop Master"
              title={editingStopMasterId ? "Edit stop" : "Add stop"}
              description="Use one compact form for either creating a new stop or updating the selected saved stop."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={masterForm.customerName}
                  onChange={(event) => updateMasterField("customerName", event.target.value)}
                  placeholder="Customer name"
                  className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
                <input
                  value={masterForm.area}
                  onChange={(event) => updateMasterField("area", event.target.value)}
                  placeholder="Area"
                  className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
                <input
                  value={masterForm.contactNumber}
                  onChange={(event) => updateMasterField("contactNumber", event.target.value)}
                  placeholder="Contact number"
                  className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
                <input
                  value={masterForm.defaultRouteGroup}
                  onChange={(event) => updateMasterField("defaultRouteGroup", event.target.value)}
                  placeholder="Default route group"
                  className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
                <input
                  value={masterForm.googleMapsLink}
                  onChange={(event) => updateMasterField("googleMapsLink", event.target.value)}
                  placeholder="Google Maps link"
                  className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={masterForm.latitude}
                    onChange={(event) => updateMasterField("latitude", event.target.value)}
                    placeholder="Latitude"
                    className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                  />
                  <input
                    value={masterForm.longitude}
                    onChange={(event) => updateMasterField("longitude", event.target.value)}
                    placeholder="Longitude"
                    className="rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                  />
                </div>
                <textarea
                  rows={3}
                  value={masterForm.address}
                  onChange={(event) => updateMasterField("address", event.target.value)}
                  placeholder="Address"
                  className="md:col-span-2 rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
                <textarea
                  rows={3}
                  value={masterForm.notes}
                  onChange={(event) => updateMasterField("notes", event.target.value)}
                  placeholder="Notes"
                  className="md:col-span-2 rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyActionKey === "create-stop-master" || busyActionKey === "update-stop-master"}
                  onClick={handleSaveMasterForm}
                  className="rounded-xl bg-drive-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-drive-accentMuted disabled:opacity-60"
                >
                  {busyActionKey === "create-stop-master" || busyActionKey === "update-stop-master"
                    ? "Saving..."
                    : editingStopMasterId
                      ? "Update Stop"
                      : "Create Stop"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditStop}
                  className="rounded-xl border border-drive-line bg-white px-4 py-2.5 text-sm font-semibold text-drive-ink hover:bg-drive-surface"
                >
                  Clear Form
                </button>
              </div>
            </SectionShell>
          </div>
        </div>
      ) : null}

      {activeTab === "performance" ? (
        <div className="space-y-5">
          <SectionShell
            eyebrow="Driver Performance"
            title="Driver ranking"
            description="Ranking favors delivered volume, completion rate, faster average delivery time, and lower idle time."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              {rankingRows.slice(0, 3).map((row, index) => (
                <div key={row.driverId} className="rounded-2xl border border-drive-line bg-drive-bg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-drive-muted">
                        Rank #{index + 1}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-drive-ink">{row.driverName}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDriverId(row.driverId);
                        setActiveTab("assign");
                      }}
                      className="rounded-xl border border-drive-line bg-white px-3 py-2 text-xs font-semibold text-drive-ink hover:bg-drive-surface"
                    >
                      View Driver
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-[11px] uppercase text-drive-muted">Completed</p>
                      <p className="mt-1 font-semibold text-emerald-700">{row.delivered}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-[11px] uppercase text-drive-muted">Failed</p>
                      <p className="mt-1 font-semibold text-red-700">{row.failed}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-[11px] uppercase text-drive-muted">Avg delivery</p>
                      <p className="mt-1 font-semibold text-drive-ink">{formatMinutes(row.averageDeliveryMinutes)}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-[11px] uppercase text-drive-muted">Idle time</p>
                      <p className="mt-1 font-semibold text-drive-ink">{formatMinutes(row.totalIdleMinutes)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionShell>

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionShell
              eyebrow="Driver Performance"
              title="Driver summary"
              description="A compact table for completed stops, failed stops, average delivery time, idle minutes, and long-stop alerts."
            >
              <div className="overflow-x-auto rounded-xl border border-drive-line">
                <table className="min-w-[62rem] text-left text-sm">
                  <thead className="bg-drive-bg text-xs uppercase tracking-wide text-drive-muted">
                    <tr>
                      <th className="px-3 py-3 font-medium">Driver</th>
                      <th className="px-3 py-3 font-medium">Completed</th>
                      <th className="px-3 py-3 font-medium">Failed</th>
                      <th className="px-3 py-3 font-medium">Avg delivery</th>
                      <th className="px-3 py-3 font-medium">Idle time</th>
                      <th className="px-3 py-3 font-medium">Long stop alerts</th>
                      <th className="px-3 py-3 font-medium">Progress</th>
                      <th className="px-3 py-3 font-medium">Last update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-drive-line bg-white">
                    {rankingRows.map((row) => (
                      <tr key={row.driverId}>
                        <td className="px-3 py-3 font-medium text-drive-ink">{row.driverName}</td>
                        <td className="px-3 py-3 text-emerald-700">{row.delivered}</td>
                        <td className="px-3 py-3 text-red-700">{row.failed}</td>
                        <td className="px-3 py-3 text-drive-ink">{formatMinutes(row.averageDeliveryMinutes)}</td>
                        <td className="px-3 py-3 text-drive-ink">{formatMinutes(row.totalIdleMinutes)}</td>
                        <td className="px-3 py-3 text-drive-ink">{row.abnormalLongStops}</td>
                        <td className="px-3 py-3 text-drive-ink">{row.completionPercent}%</td>
                        <td className="px-3 py-3 text-drive-muted">{formatDateTime(row.lastUpdateAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionShell>

            <SectionShell
              eyebrow="Driver Performance"
              title="Route difficulty"
              description="Routes with longer average stop time or delay are harder and may need a better plan."
            >
              <div className="space-y-3">
                {routeAnalytics.map((route) => (
                  <div key={route.routeId} className="rounded-2xl border border-drive-line bg-drive-bg p-4">
                    <p className="text-sm font-semibold text-drive-ink">{route.routeName}</p>
                    <p className="mt-1 text-xs text-drive-muted">
                      {route.totalStops} stops · {route.delivered} delivered · {route.failed} failed
                    </p>
                    <p className="mt-1 text-xs text-drive-muted">
                      Avg stop {formatMinutes(route.averageStopMinutes)} · Avg delay {formatMinutes(route.averageDelayMinutes)}
                    </p>
                    <p className="mt-2 text-xs text-drive-muted">Last update {formatDateTime(route.lastUpdateAt)}</p>
                  </div>
                ))}
              </div>
            </SectionShell>
          </div>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionShell
            eyebrow="Settings"
            title="Driver accounts"
            description="Create new drivers or edit existing ones. Usernames must be unique within your company; routes and deliveries stay linked by driver id when you rename a login."
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className={`rounded-2xl border p-4 ${
                    editingDriverId === driver.id ? "border-drive-accent bg-emerald-50/50" : "border-drive-line bg-drive-bg"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-drive-ink">{driver.name}</p>
                      <p className="mt-1 truncate text-xs text-drive-muted">
                        @{driver.username} · {driver.vehicle}
                      </p>
                      <p className="mt-1 text-xs text-drive-muted">
                        {driver.phone} · {driver.zone} · {driver.shiftStart}–{driver.shiftEnd}
                      </p>
                      {!driver.isActive ? (
                        <p className="mt-2 text-xs font-semibold text-red-700">Account deactivated</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => beginEditDriver(driver)}
                      className="shrink-0 rounded-lg border border-drive-line bg-white px-3 py-1.5 text-xs font-semibold text-drive-ink hover:bg-drive-surface"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleDriverFormSubmit} className="grid gap-3 sm:grid-cols-2">
              {editingDriverId ? (
                <p className="sm:col-span-2 text-sm text-drive-muted">
                  Leave password blank to keep the current password. Changing username updates the login immediately.
                </p>
              ) : null}
              <input
                value={driverForm.name}
                onChange={(event) => updateDriverField("name", event.target.value)}
                placeholder="Driver name"
                className="rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
              />
              <input
                value={driverForm.phone}
                onChange={(event) => updateDriverField("phone", event.target.value)}
                placeholder="Phone"
                className="rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
              />
              <input
                value={driverForm.username}
                onChange={(event) => updateDriverField("username", event.target.value)}
                placeholder="Username"
                className="rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
              />
              <input
                value={driverForm.password}
                onChange={(event) => updateDriverField("password", event.target.value)}
                type="password"
                placeholder={editingDriverId ? "New password (optional)" : "Password"}
                autoComplete="new-password"
                className="rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
              />
              <input
                value={driverForm.vehicle}
                onChange={(event) => updateDriverField("vehicle", event.target.value)}
                placeholder="Vehicle"
                className="rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
              />
              <input
                value={driverForm.zone}
                onChange={(event) => updateDriverField("zone", event.target.value)}
                placeholder="Zone"
                className="rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
              />
              <input
                type="time"
                value={driverForm.shiftStart}
                onChange={(event) => updateDriverField("shiftStart", event.target.value)}
                className="rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
              />
              <input
                type="time"
                value={driverForm.shiftEnd}
                onChange={(event) => updateDriverField("shiftEnd", event.target.value)}
                className="rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
              />
              <label className="sm:col-span-2 flex cursor-pointer items-center gap-2 text-sm text-drive-ink">
                <input
                  type="checkbox"
                  checked={driverForm.isActive}
                  onChange={(event) => updateDriverField("isActive", event.target.checked)}
                  className="h-4 w-4 rounded border-drive-line"
                />
                Active (can sign in and receive new route assignments)
              </label>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-xl bg-drive-accent px-5 py-3 text-sm font-semibold text-white hover:bg-drive-accentMuted"
                >
                  {editingDriverId ? "Save changes" : "Create Driver Account"}
                </button>
                {editingDriverId ? (
                  <button
                    type="button"
                    onClick={cancelDriverEdit}
                    className="rounded-xl border border-drive-line bg-white px-5 py-3 text-sm font-semibold text-drive-ink hover:bg-drive-surface"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </SectionShell>

          <SectionShell
            eyebrow="Settings"
            title="Demo tools"
            description="Reset sample data or sign out without leaving the admin dashboard."
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-drive-line bg-drive-bg p-4">
                <p className="text-sm font-semibold text-drive-ink">Reset demo data</p>
                <p className="mt-1 text-sm text-drive-muted">
                  Restore drivers, stops, routes, and analytics back to the seeded sample set.
                </p>
                <button
                  type="button"
                  onClick={handleResetDay}
                  className="mt-4 rounded-xl border border-drive-line bg-white px-4 py-2.5 text-sm font-semibold text-drive-ink hover:bg-drive-surface"
                >
                  Reset Sample Data
                </button>
              </div>

              <div className="rounded-2xl border border-drive-line bg-drive-bg p-4">
                <p className="text-sm font-semibold text-drive-ink">Sign out</p>
                <p className="mt-1 text-sm text-drive-muted">Return to the login page for the next admin or driver session.</p>
                <div className="mt-4">
                  <SessionLogoutButton />
                </div>
              </div>
            </div>
          </SectionShell>
        </div>
      ) : null}
    </div>
      </main>
    </div>
  );
}
