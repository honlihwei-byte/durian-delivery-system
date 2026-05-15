import type {
  AdminAccountRow,
  CompanyRow,
  DeliveryAction,
  DeliveryEvent,
  DeliveryOrderRow,
  DeliveryRouteRow,
  DeliveryStatus,
  DeliveryStore,
  DriverRow,
  GeoPoint,
  PhotoNeedReason,
  RouteStatus,
  StopMasterRow,
} from "@/types/delivery";

const STORAGE_KEY = "testing-system-driver-checkin-v8";
/**
 * Single localStorage document for the delivery demo: companies, admins, **drivers (login + profile)**,
 * stop masters, routes, and orders. Driver username/password for sign-in are the `username` / `password`
 * fields on each `DriverRow` — there is no separate user table. `updateDriverAccount` mutates that row
 * and `writeStore` persists it; `loginDriverSession` reads via `getDriverByUsername` from the same key.
 */
const STORE_VERSION = 8;

/** Demo tenant ids — all domain rows reference one of these. */
const DEMO_COMPANY_MX_FRUIT = "comp-mx-fruit";
const DEMO_COMPANY_ABC_FROZEN = "comp-abc-frozen";
const DEMO_COMPANY_MINI_MART = "comp-mini-mart";

function makeDemoCompanies(): CompanyRow[] {
  return [
    { companyId: DEMO_COMPANY_MX_FRUIT, companyName: "MX Fruit", companyCode: "MXFRUIT" },
    { companyId: DEMO_COMPANY_ABC_FROZEN, companyName: "ABC Frozen", companyCode: "ABCFROZEN" },
    { companyId: DEMO_COMPANY_MINI_MART, companyName: "Mini Mart Supplier", companyCode: "MINIMART" },
  ];
}

type StopMasterInput = {
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

type SeedOrderInput = {
  id: string;
  stopMasterId: string;
  routeId: string;
  assignedDriverId: string | null;
  orderNumber: string;
  routeDate: string;
  stopNumber: number;
  totalAmount: number;
  status: DeliveryStatus;
  createdAt: string;
  updatedAt: string;
  tripStartedAt: string | null;
  arrivedAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  latestLocation: GeoPoint;
  remark?: string | null;
  photoNeedReasons?: PhotoNeedReason[];
};

export type DeliveryStoreResult =
  | { ok: true; store: DeliveryStore }
  | { ok: false; error: string; store?: DeliveryStore };

export type CreateStopMasterResult =
  | { ok: true; store: DeliveryStore; stopMasterId: string }
  | { ok: false; error: string; store?: DeliveryStore };

export type UpdateStopMasterResult =
  | { ok: true; store: DeliveryStore; stopMasterId: string }
  | { ok: false; error: string; store?: DeliveryStore };

function nowIso() {
  return new Date().toISOString();
}

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

function todayRouteDate() {
  const today = new Date();
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isoAt(dateValue: string, hour: number, minute: number) {
  return new Date(`${dateValue}T${pad(hour)}:${pad(minute)}:00`).toISOString();
}

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function googleMapsPointLink(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function unavailableLocation(): GeoPoint {
  return {
    latitude: null,
    longitude: null,
    accuracy: null,
    source: "unavailable",
  };
}

function roundCoord(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function normalizeGoogleMapsLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function parseOptionalCoordinate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true as const, value: null };
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return { ok: false as const, error: "Latitude and longitude must be valid numbers." };
  }
  return { ok: true as const, value: parsed };
}

function parseStopMasterInput(input: StopMasterInput) {
  const customerName = input.customerName.trim();
  const area = input.area.trim();
  const address = input.address.trim();
  const contactNumber = input.contactNumber.trim();
  const googleMapsLink = normalizeGoogleMapsLink(input.googleMapsLink);
  const defaultRouteGroup = input.defaultRouteGroup.trim();
  const notes = input.notes.trim();
  const latitude = parseOptionalCoordinate(input.latitude);
  const longitude = parseOptionalCoordinate(input.longitude);

  if (!latitude.ok) {
    return {
      ok: false as const,
      error: latitude.error,
    };
  }

  if (!longitude.ok) {
    return {
      ok: false as const,
      error: longitude.error,
    };
  }

  if (!customerName || !address || !defaultRouteGroup) {
    return {
      ok: false as const,
      error: "Customer name, address, and default route group are required.",
    };
  }

  return {
    ok: true as const,
    value: {
      customerName,
      area: area || "General Area",
      address,
      contactNumber: contactNumber || "-",
      googleMapsLink,
      latitude: latitude.value,
      longitude: longitude.value,
      defaultRouteGroup,
      notes,
    },
  };
}

async function captureCurrentLocation(): Promise<GeoPoint> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return unavailableLocation();
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(unavailableLocation()), 7_500);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeout);
        resolve({
          latitude: roundCoord(position.coords.latitude),
          longitude: roundCoord(position.coords.longitude),
          accuracy: Math.round(position.coords.accuracy),
          source: "browser",
        });
      },
      () => {
        window.clearTimeout(timeout);
        resolve(unavailableLocation());
      },
      {
        enableHighAccuracy: true,
        timeout: 6_500,
        maximumAge: 0,
      }
    );
  });
}

function cloneStore(store: DeliveryStore): DeliveryStore {
  return JSON.parse(JSON.stringify(store)) as DeliveryStore;
}

function nextId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

function makeAdmins(): AdminAccountRow[] {
  return [
    {
      userId: "user-admin-mx",
      companyId: DEMO_COMPANY_MX_FRUIT,
      name: "MX Fruit Operations",
      username: "admin",
      password: "admin",
    },
    {
      userId: "user-admin-abc",
      companyId: DEMO_COMPANY_ABC_FROZEN,
      name: "ABC Frozen Operations",
      username: "admin",
      password: "admin",
    },
    {
      userId: "user-admin-mini",
      companyId: DEMO_COMPANY_MINI_MART,
      name: "Mini Mart Supplier Operations",
      username: "admin",
      password: "admin",
    },
  ];
}

function makeSampleDrivers(): DriverRow[] {
  const createdAt = isoMinutesAgo(500);

  return [
    {
      id: "driver-kumar",
      companyId: DEMO_COMPANY_MX_FRUIT,
      name: "Kumar",
      username: "kumar",
      password: "demo123",
      phone: "012-310 4502",
      vehicle: "Van WXY 2184",
      zone: "Klang Valley",
      shiftStart: "07:30",
      shiftEnd: "16:30",
      createdAt,
      isActive: true,
    },
    {
      id: "driver-mei-ling",
      companyId: DEMO_COMPANY_ABC_FROZEN,
      name: "Mei Ling",
      username: "meiling",
      password: "demo123",
      phone: "012-881 2098",
      vehicle: "Refrigerated BPK 7711",
      zone: "Perak",
      shiftStart: "08:00",
      shiftEnd: "17:00",
      createdAt,
      isActive: true,
    },
    {
      id: "driver-ah-chong",
      companyId: DEMO_COMPANY_MINI_MART,
      name: "Ah Chong",
      username: "ahchong",
      password: "demo123",
      phone: "011-4088 6112",
      vehicle: "Van JMN 9405",
      zone: "KL Central",
      shiftStart: "07:45",
      shiftEnd: "16:45",
      createdAt,
      isActive: true,
    },
    {
      id: "driver-ravi",
      companyId: DEMO_COMPANY_MINI_MART,
      name: "Ravi",
      username: "ravi",
      password: "demo123",
      phone: "017-640 9011",
      vehicle: "Van VDU 5509",
      zone: "New Town",
      shiftStart: "09:00",
      shiftEnd: "18:00",
      createdAt,
      isActive: true,
    },
  ];
}

function makeStopMasters(): StopMasterRow[] {
  const createdAt = isoMinutesAgo(700);

  return [
    {
      id: "master-restoran-xyz",
      companyId: DEMO_COMPANY_MX_FRUIT,
      customerName: "Restoran XYZ",
      area: "Petaling Jaya",
      address: "88 Jalan Universiti 3, Petaling Jaya",
      contactNumber: "03-7780 2210",
      googleMapsLink: googleMapsPointLink(3.118742, 101.636604),
      latitude: 3.118742,
      longitude: 101.636604,
      defaultRouteGroup: "Klang Valley Route",
      notes: "Banquet kitchen entrance — ring bell twice.",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "master-kelana-grocer",
      companyId: DEMO_COMPANY_MX_FRUIT,
      customerName: "Kelana Grocer",
      area: "Kelana Jaya",
      address: "15 Jalan SS6/12, Kelana Jaya",
      contactNumber: "03-7880 4412",
      googleMapsLink: googleMapsPointLink(3.104512, 101.598881),
      latitude: 3.104512,
      longitude: 101.598881,
      defaultRouteGroup: "Klang Valley Route",
      notes: "Cold room handover; average dwell ~25 min.",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "master-tf-tambun",
      companyId: DEMO_COMPANY_ABC_FROZEN,
      customerName: "TF Tambun",
      area: "Tambun",
      address: "18 Jalan Tambun Jaya 4, Tambun",
      contactNumber: "05-546 1120",
      googleMapsLink: googleMapsPointLink(4.603114, 101.112518),
      latitude: 4.603114,
      longitude: 101.112518,
      defaultRouteGroup: "Perak Frozen Route",
      notes: "Receiving wants ETA call 10 minutes out.",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "master-tf-falim",
      companyId: DEMO_COMPANY_ABC_FROZEN,
      customerName: "TF Falim",
      area: "Falim",
      address: "5 Persiaran Falim 7, Ipoh",
      contactNumber: "05-241 4408",
      googleMapsLink: googleMapsPointLink(4.618641, 101.122393),
      latitude: 4.618641,
      longitude: 101.122393,
      defaultRouteGroup: "Perak Frozen Route",
      notes: "Loading dock B after 10:00.",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "master-gunung-lang-mini",
      companyId: DEMO_COMPANY_ABC_FROZEN,
      customerName: "Gunung Lang Mini",
      area: "Chemor",
      address: "Lot 12 Jalan Chemor Perdana 2, Chemor",
      contactNumber: "05-529 9011",
      googleMapsLink: googleMapsPointLink(4.62912, 101.1184),
      latitude: 4.62912,
      longitude: 101.1184,
      defaultRouteGroup: "Perak Frozen Route",
      notes: "Satellite outlet — mixed dry and frozen pallets.",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "master-hala-mini",
      companyId: DEMO_COMPANY_MINI_MART,
      customerName: "Hala Mini Market",
      area: "Pudu",
      address: "42 Jalan Brunei Barat, Pudu",
      contactNumber: "03-2144 8890",
      googleMapsLink: googleMapsPointLink(3.14189, 101.71205),
      latitude: 3.14189,
      longitude: 101.71205,
      defaultRouteGroup: "KL Central Route",
      notes: "Tight alley — reverse in from north end.",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "master-pudu-wholesale",
      companyId: DEMO_COMPANY_MINI_MART,
      customerName: "Pudu Wholesale",
      area: "Pudu",
      address: "8 Lorong Brunei 3, Kuala Lumpur",
      contactNumber: "03-2142 6610",
      googleMapsLink: googleMapsPointLink(3.14012, 101.71342),
      latitude: 3.14012,
      longitude: 101.71342,
      defaultRouteGroup: "KL Central Route",
      notes: "Second drop on KL Central loop.",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "master-soon-lee",
      companyId: DEMO_COMPANY_MINI_MART,
      customerName: "Soon Lee Grocer",
      area: "New Town",
      address: "9 Jalan Damai 3, New Town",
      contactNumber: "03-8890 1203",
      googleMapsLink: googleMapsPointLink(3.012211, 101.42408),
      latitude: 3.012211,
      longitude: 101.42408,
      defaultRouteGroup: "New Town Route",
      notes: "Flagged as new customer — proof of delivery photo.",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "master-bandar-mini",
      companyId: DEMO_COMPANY_MINI_MART,
      customerName: "Bandar Baru Mini",
      area: "New Town",
      address: "33 Jalan Permai 2, Bandar Baru",
      contactNumber: "03-8891 2044",
      googleMapsLink: googleMapsPointLink(3.00988, 101.4312),
      latitude: 3.00988,
      longitude: 101.4312,
      defaultRouteGroup: "New Town Route",
      notes: "Evening slot preferred after 16:00.",
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

function makeEvent(input: {
  id: string;
  companyId: string;
  driverId: string;
  routeId: string;
  orderId: string | null;
  action: DeliveryAction;
  status: DeliveryStatus | null;
  createdAt: string;
  location: GeoPoint;
  remark?: string | null;
  photoDataUrl?: string | null;
  photoName?: string | null;
}): DeliveryEvent {
  return {
    id: input.id,
    companyId: input.companyId,
    driverId: input.driverId,
    routeId: input.routeId,
    orderId: input.orderId,
    action: input.action,
    status: input.status,
    remark: input.remark ?? null,
    createdAt: input.createdAt,
    location: input.location,
    photoDataUrl: input.photoDataUrl ?? null,
    photoName: input.photoName ?? null,
  };
}

function makeRoute(input: {
  id: string;
  companyId: string;
  routeName: string;
  routeDate: string;
  assignedDriverId?: string | null;
  startedAt?: string | null;
  lastEventAt?: string | null;
  lastLocation?: GeoPoint;
}): DeliveryRouteRow {
  return {
    id: input.id,
    companyId: input.companyId,
    routeName: input.routeName,
    routeDate: input.routeDate,
    assignedDriverId: input.assignedDriverId ?? null,
    status: "assigned",
    stopOrderIds: [],
    startedAt: input.startedAt ?? null,
    lastEventAt: input.lastEventAt ?? input.startedAt ?? null,
    lastLocation: input.lastLocation ?? unavailableLocation(),
    events: [],
  };
}

function indexStopMasters(stopMasters: StopMasterRow[]) {
  return new Map(stopMasters.map((stop) => [stop.id, stop]));
}

function makeSeedOrder(input: SeedOrderInput, stopMasters: Map<string, StopMasterRow>): DeliveryOrderRow {
  const master = stopMasters.get(input.stopMasterId);
  if (!master) {
    throw new Error(`Missing stop master ${input.stopMasterId}`);
  }

  return {
    id: input.id,
    companyId: master.companyId,
    stopMasterId: input.stopMasterId,
    routeId: input.routeId,
    assignedDriverId: input.assignedDriverId,
    orderNumber: input.orderNumber,
    routeDate: input.routeDate,
    stopNumber: input.stopNumber,
    customerName: master.customerName,
    area: master.area,
    address: master.address,
    contactNumber: master.contactNumber,
    googleMapsLink: master.googleMapsLink,
    latitude: master.latitude,
    longitude: master.longitude,
    notes: master.notes,
    totalAmount: input.totalAmount,
    status: input.status,
    photoNeedReasons: input.photoNeedReasons ?? [],
    remark: input.remark ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    tripStartedAt: input.tripStartedAt,
    arrivedAt: input.arrivedAt,
    deliveredAt: input.deliveredAt,
    failedAt: input.failedAt,
    latestLocation: input.latestLocation,
    events: [],
  };
}

function getOrdersForRoute(store: DeliveryStore, routeId: string) {
  return store.orders
    .filter((order) => order.routeId === routeId)
    .sort((a, b) => a.stopNumber - b.stopNumber);
}

function getOrdersForDriver(store: DeliveryStore, driverId: string, routeDate?: string) {
  return store.orders
    .filter(
      (order) =>
        order.assignedDriverId === driverId &&
        (routeDate ? order.routeDate === routeDate : true)
    )
    .sort(
      (a, b) =>
        a.routeDate.localeCompare(b.routeDate) ||
        a.routeId.localeCompare(b.routeId) ||
        a.stopNumber - b.stopNumber
    );
}

function getOrdersForDriverOnRoute(store: DeliveryStore, driverId: string, routeId: string) {
  return getOrdersForRoute(store, routeId).filter((order) => order.assignedDriverId === driverId);
}

function getAssignedDriverIdsForRoute(store: DeliveryStore, routeId: string) {
  return Array.from(
    new Set(
      getOrdersForRoute(store, routeId)
        .map((order) => order.assignedDriverId)
        .filter((driverId): driverId is string => Boolean(driverId))
    )
  );
}

function deriveRouteStatus(route: DeliveryRouteRow, store: DeliveryStore): RouteStatus {
  const orders = getOrdersForRoute(store, route.id);
  const assignedDriverIds = getAssignedDriverIdsForRoute(store, route.id);

  if (assignedDriverIds.length === 0) {
    return "unassigned";
  }

  if (
    orders.length > 0 &&
    orders.every((order) => order.status === "delivered" || order.status === "failed")
  ) {
    return "completed";
  }

  if (route.startedAt) {
    return "on_route";
  }

  if (assignedDriverIds.length > 1) {
    return "mixed";
  }

  return "assigned";
}

function resequenceRouteStops(routeId: string, store: DeliveryStore) {
  const routeOrders = getOrdersForRoute(store, routeId);
  routeOrders.forEach((order, index) => {
    order.stopNumber = index + 1;
  });
  const route = store.routes.find((item) => item.id === routeId);
  if (route) {
    route.stopOrderIds = routeOrders.map((order) => order.id);
  }
}

function syncRouteState(routeId: string, store: DeliveryStore) {
  const route = store.routes.find((item) => item.id === routeId);
  if (!route) return;

  resequenceRouteStops(routeId, store);

  const assignedDriverIds = getAssignedDriverIdsForRoute(store, routeId);
  route.assignedDriverId = assignedDriverIds.length === 1 ? assignedDriverIds[0] : null;
  route.status = deriveRouteStatus(route, store);

  const latestEvent =
    [...route.events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ??
    null;
  if (latestEvent) {
    route.lastEventAt = latestEvent.createdAt;
    route.lastLocation = latestEvent.location;
  }
}

function cleanupEmptyRoutes(store: DeliveryStore) {
  store.routes = store.routes.filter((route) => {
    const hasStops = store.orders.some((order) => order.routeId === route.id);
    if (hasStops) return true;
    return route.events.length > 0;
  });
}

function findRouteByNameAndDate(store: DeliveryStore, companyId: string, routeName: string, routeDate: string) {
  return (
    store.routes.find(
      (route) =>
        route.companyId === companyId &&
        route.routeName.toLowerCase() === routeName.toLowerCase() &&
        route.routeDate === routeDate
    ) ?? null
  );
}

function ensureRoute(store: DeliveryStore, companyId: string, routeName: string, routeDate: string) {
  const existing = findRouteByNameAndDate(store, companyId, routeName, routeDate);
  if (existing) return existing;

  const route = makeRoute({
    id: nextId("route"),
    companyId,
    routeName,
    routeDate,
  });
  store.routes.push(route);
  return route;
}

function buildOrderNumber(store: DeliveryStore, companyId: string, routeDate: string) {
  const count =
    store.orders.filter((order) => order.companyId === companyId && order.routeDate === routeDate).length + 1;
  return `ST-${routeDate.replaceAll("-", "")}-${pad(count)}`;
}

function upsertAssignmentFromMaster(store: DeliveryStore, stopMasterId: string, driverId: string | null, routeDate: string) {
  const master = findStopMaster(store, stopMasterId);
  if (!master) {
    throw new Error("Stop master not found.");
  }

  const routeName = master.defaultRouteGroup.trim() || "Ad Hoc Route";
  const targetRoute = ensureRoute(store, master.companyId, routeName, routeDate);
  const existing = store.orders.find((order) => order.stopMasterId === stopMasterId && order.routeDate === routeDate);

  if (existing) {
    const previousRouteId = existing.routeId;
    existing.routeId = targetRoute.id;
    existing.assignedDriverId = driverId;
    existing.customerName = master.customerName;
    existing.area = master.area;
    existing.address = master.address;
    existing.contactNumber = master.contactNumber;
    existing.googleMapsLink = master.googleMapsLink;
    existing.latitude = master.latitude;
    existing.longitude = master.longitude;
    existing.notes = master.notes;
    existing.updatedAt = nowIso();
    resequenceRouteStops(previousRouteId, store);
    syncRouteState(previousRouteId, store);
    syncRouteState(targetRoute.id, store);
    cleanupEmptyRoutes(store);
    return existing;
  }

  const createdAt = nowIso();
  const nextStopNumber = getOrdersForRoute(store, targetRoute.id).length + 1;
  const order: DeliveryOrderRow = {
    id: nextId("order"),
    companyId: master.companyId,
    stopMasterId: master.id,
    routeId: targetRoute.id,
    assignedDriverId: driverId,
    orderNumber: buildOrderNumber(store, master.companyId, routeDate),
    routeDate,
    stopNumber: nextStopNumber,
    customerName: master.customerName,
    area: master.area,
    address: master.address,
    contactNumber: master.contactNumber,
    googleMapsLink: master.googleMapsLink,
    latitude: master.latitude,
    longitude: master.longitude,
    notes: master.notes,
    totalAmount: 0,
    status: "pending",
    photoNeedReasons: [],
    remark: null,
    createdAt,
    updatedAt: createdAt,
    tripStartedAt: null,
    arrivedAt: null,
    deliveredAt: null,
    failedAt: null,
    latestLocation: unavailableLocation(),
    events: [],
  };

  store.orders.push(order);
  syncRouteState(targetRoute.id, store);
  return order;
}

function makeSampleStore(): DeliveryStore {
  const routeDate = todayRouteDate();
  const previousDate = dateDaysAgo(1);
  const twoDaysAgo = dateDaysAgo(2);
  const stopMasters = makeStopMasters();
  const stopMasterMap = indexStopMasters(stopMasters);
  const drivers = makeSampleDrivers();
  const admins = makeAdmins();

  const routes: DeliveryRouteRow[] = [
    makeRoute({
      id: "route-mx-kv-today",
      companyId: DEMO_COMPANY_MX_FRUIT,
      routeName: "Klang Valley Route",
      routeDate,
      assignedDriverId: "driver-kumar",
      startedAt: isoMinutesAgo(210),
      lastEventAt: isoMinutesAgo(22),
      lastLocation: {
        latitude: 3.104512,
        longitude: 101.598881,
        accuracy: 14,
        source: "browser",
      },
    }),
    makeRoute({
      id: "route-abc-perak-today",
      companyId: DEMO_COMPANY_ABC_FROZEN,
      routeName: "Perak Frozen Route",
      routeDate,
      assignedDriverId: "driver-mei-ling",
      startedAt: isoMinutesAgo(195),
      lastEventAt: isoMinutesAgo(96),
      lastLocation: {
        latitude: 4.618641,
        longitude: 101.122393,
        accuracy: 16,
        source: "browser",
      },
    }),
    makeRoute({
      id: "route-mini-kl-today",
      companyId: DEMO_COMPANY_MINI_MART,
      routeName: "KL Central Route",
      routeDate,
      assignedDriverId: "driver-ah-chong",
      startedAt: isoMinutesAgo(165),
      lastEventAt: isoMinutesAgo(28),
      lastLocation: {
        latitude: 3.14189,
        longitude: 101.71205,
        accuracy: 12,
        source: "browser",
      },
    }),
    makeRoute({
      id: "route-mini-nt-today",
      companyId: DEMO_COMPANY_MINI_MART,
      routeName: "New Town Route",
      routeDate,
      assignedDriverId: "driver-ravi",
      startedAt: null,
      lastEventAt: null,
      lastLocation: unavailableLocation(),
    }),
    makeRoute({
      id: "route-mx-kv-prev",
      companyId: DEMO_COMPANY_MX_FRUIT,
      routeName: "Klang Valley Route",
      routeDate: previousDate,
      assignedDriverId: "driver-kumar",
      startedAt: isoAt(previousDate, 8, 0),
      lastEventAt: isoAt(previousDate, 10, 40),
      lastLocation: {
        latitude: 3.118742,
        longitude: 101.636604,
        accuracy: 18,
        source: "browser",
      },
    }),
    makeRoute({
      id: "route-abc-perak-prev",
      companyId: DEMO_COMPANY_ABC_FROZEN,
      routeName: "Perak Frozen Route",
      routeDate: previousDate,
      assignedDriverId: "driver-mei-ling",
      startedAt: isoAt(previousDate, 8, 15),
      lastEventAt: isoAt(previousDate, 11, 20),
      lastLocation: {
        latitude: 4.62105,
        longitude: 101.129211,
        accuracy: 18,
        source: "browser",
      },
    }),
    makeRoute({
      id: "route-mini-kl-prev",
      companyId: DEMO_COMPANY_MINI_MART,
      routeName: "KL Central Route",
      routeDate: twoDaysAgo,
      assignedDriverId: "driver-ah-chong",
      startedAt: isoAt(twoDaysAgo, 7, 55),
      lastEventAt: isoAt(twoDaysAgo, 10, 10),
      lastLocation: {
        latitude: 3.1415,
        longitude: 101.711,
        accuracy: 18,
        source: "browser",
      },
    }),
    makeRoute({
      id: "route-mini-nt-prev",
      companyId: DEMO_COMPANY_MINI_MART,
      routeName: "New Town Route",
      routeDate: previousDate,
      assignedDriverId: "driver-ravi",
      startedAt: isoAt(previousDate, 9, 5),
      lastEventAt: isoAt(previousDate, 10, 40),
      lastLocation: unavailableLocation(),
    }),
  ];

  const orders: DeliveryOrderRow[] = [
    makeSeedOrder(
      {
        id: "order-mx-001",
        stopMasterId: "master-restoran-xyz",
        routeId: "route-mx-kv-today",
        assignedDriverId: "driver-kumar",
        orderNumber: "MX-24001",
        routeDate,
        stopNumber: 1,
        totalAmount: 412.5,
        status: "delivered",
        createdAt: isoMinutesAgo(280),
        updatedAt: isoMinutesAgo(140),
        tripStartedAt: isoMinutesAgo(210),
        arrivedAt: isoMinutesAgo(155),
        deliveredAt: isoMinutesAgo(140),
        failedAt: null,
        latestLocation: {
          latitude: 3.118742,
          longitude: 101.636604,
          accuracy: 11,
          source: "browser",
        },
        remark: "Proof-of-delivery photo captured; 24 fruit crates signed.",
        photoNeedReasons: ["high_value_order"],
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "order-mx-002",
        stopMasterId: "master-kelana-grocer",
        routeId: "route-mx-kv-today",
        assignedDriverId: "driver-kumar",
        orderNumber: "MX-24002",
        routeDate,
        stopNumber: 2,
        totalAmount: 268.4,
        status: "arrived",
        createdAt: isoMinutesAgo(260),
        updatedAt: isoMinutesAgo(2),
        tripStartedAt: isoMinutesAgo(210),
        arrivedAt: isoMinutesAgo(58),
        deliveredAt: null,
        failedAt: null,
        latestLocation: {
          latitude: 3.104512,
          longitude: 101.598881,
          accuracy: 15,
          source: "browser",
        },
        remark: "GPS ping on arrival · unloading checklist in progress (extended dwell).",
        photoNeedReasons: [],
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "order-abc-001",
        stopMasterId: "master-tf-tambun",
        routeId: "route-abc-perak-today",
        assignedDriverId: "driver-mei-ling",
        orderNumber: "ABC-24001",
        routeDate,
        stopNumber: 1,
        totalAmount: 518.2,
        status: "delivered",
        createdAt: isoMinutesAgo(230),
        updatedAt: isoMinutesAgo(128),
        tripStartedAt: isoMinutesAgo(195),
        arrivedAt: isoMinutesAgo(142),
        deliveredAt: isoMinutesAgo(128),
        failedAt: null,
        latestLocation: {
          latitude: 4.603114,
          longitude: 101.112518,
          accuracy: 14,
          source: "browser",
        },
        remark: "Chiller chain verified; GPS trail logged along Jalan Tambun Jaya.",
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "order-abc-002",
        stopMasterId: "master-tf-falim",
        routeId: "route-abc-perak-today",
        assignedDriverId: "driver-mei-ling",
        orderNumber: "ABC-24002",
        routeDate,
        stopNumber: 2,
        totalAmount: 198.75,
        status: "delivered",
        createdAt: isoMinutesAgo(220),
        updatedAt: isoMinutesAgo(100),
        tripStartedAt: isoMinutesAgo(195),
        arrivedAt: isoMinutesAgo(118),
        deliveredAt: isoMinutesAgo(100),
        failedAt: null,
        latestLocation: {
          latitude: 4.618641,
          longitude: 101.122393,
          accuracy: 16,
          source: "browser",
        },
        remark: "Late completion: dock queue + pallet verification (~90 min on site).",
        photoNeedReasons: ["random_check"],
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "order-abc-003",
        stopMasterId: "master-gunung-lang-mini",
        routeId: "route-abc-perak-today",
        assignedDriverId: "driver-mei-ling",
        orderNumber: "ABC-24003",
        routeDate,
        stopNumber: 3,
        totalAmount: 244.1,
        status: "pending",
        createdAt: isoMinutesAgo(200),
        updatedAt: isoMinutesAgo(200),
        tripStartedAt: isoMinutesAgo(195),
        arrivedAt: null,
        deliveredAt: null,
        failedAt: null,
        latestLocation: unavailableLocation(),
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "order-mini-kl-001",
        stopMasterId: "master-hala-mini",
        routeId: "route-mini-kl-today",
        assignedDriverId: "driver-ah-chong",
        orderNumber: "MM-24001",
        routeDate,
        stopNumber: 1,
        totalAmount: 156.2,
        status: "failed",
        createdAt: isoMinutesAgo(200),
        updatedAt: isoMinutesAgo(72),
        tripStartedAt: isoMinutesAgo(165),
        arrivedAt: isoMinutesAgo(82),
        deliveredAt: null,
        failedAt: isoMinutesAgo(72),
        latestLocation: {
          latitude: 3.14189,
          longitude: 101.71205,
          accuracy: 13,
          source: "browser",
        },
        remark: "Closed for stocktake — redelivery scheduled; last GPS fix at kerb.",
        photoNeedReasons: ["complaint_customer"],
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "order-mini-kl-002",
        stopMasterId: "master-pudu-wholesale",
        routeId: "route-mini-kl-today",
        assignedDriverId: "driver-ah-chong",
        orderNumber: "MM-24002",
        routeDate,
        stopNumber: 2,
        totalAmount: 92.4,
        status: "pending",
        createdAt: isoMinutesAgo(95),
        updatedAt: isoMinutesAgo(28),
        tripStartedAt: isoMinutesAgo(165),
        arrivedAt: null,
        deliveredAt: null,
        failedAt: null,
        latestLocation: {
          latitude: 3.14012,
          longitude: 101.71342,
          accuracy: 20,
          source: "browser",
        },
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "order-mini-nt-001",
        stopMasterId: "master-soon-lee",
        routeId: "route-mini-nt-today",
        assignedDriverId: "driver-ravi",
        orderNumber: "MM-24003",
        routeDate,
        stopNumber: 1,
        totalAmount: 178.9,
        status: "pending",
        createdAt: isoMinutesAgo(40),
        updatedAt: isoMinutesAgo(40),
        tripStartedAt: null,
        arrivedAt: null,
        deliveredAt: null,
        failedAt: null,
        latestLocation: unavailableLocation(),
        photoNeedReasons: ["new_customer"],
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "order-mini-nt-002",
        stopMasterId: "master-bandar-mini",
        routeId: "route-mini-nt-today",
        assignedDriverId: "driver-ravi",
        orderNumber: "MM-24004",
        routeDate,
        stopNumber: 2,
        totalAmount: 64.5,
        status: "pending",
        createdAt: isoMinutesAgo(35),
        updatedAt: isoMinutesAgo(35),
        tripStartedAt: null,
        arrivedAt: null,
        deliveredAt: null,
        failedAt: null,
        latestLocation: unavailableLocation(),
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "hist-mx-101",
        stopMasterId: "master-restoran-xyz",
        routeId: "route-mx-kv-prev",
        assignedDriverId: "driver-kumar",
        orderNumber: "MX-23971",
        routeDate: previousDate,
        stopNumber: 1,
        totalAmount: 355.0,
        status: "delivered",
        createdAt: isoAt(previousDate, 7, 50),
        updatedAt: isoAt(previousDate, 8, 48),
        tripStartedAt: isoAt(previousDate, 8, 0),
        arrivedAt: isoAt(previousDate, 8, 28),
        deliveredAt: isoAt(previousDate, 8, 48),
        failedAt: null,
        latestLocation: {
          latitude: 3.1187,
          longitude: 101.6365,
          accuracy: 17,
          source: "browser",
        },
        remark: "Morning slot; GPS captured at gate.",
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "hist-mx-102",
        stopMasterId: "master-kelana-grocer",
        routeId: "route-mx-kv-prev",
        assignedDriverId: "driver-kumar",
        orderNumber: "MX-23972",
        routeDate: previousDate,
        stopNumber: 2,
        totalAmount: 198.2,
        status: "delivered",
        createdAt: isoAt(previousDate, 7, 55),
        updatedAt: isoAt(previousDate, 9, 42),
        tripStartedAt: isoAt(previousDate, 8, 0),
        arrivedAt: isoAt(previousDate, 9, 12),
        deliveredAt: isoAt(previousDate, 9, 42),
        failedAt: null,
        latestLocation: {
          latitude: 3.1045,
          longitude: 101.5989,
          accuracy: 19,
          source: "browser",
        },
        remark: "Delayed start at Kelana — traffic on LDP.",
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "hist-abc-201",
        stopMasterId: "master-tf-tambun",
        routeId: "route-abc-perak-prev",
        assignedDriverId: "driver-mei-ling",
        orderNumber: "ABC-23973",
        routeDate: previousDate,
        stopNumber: 1,
        totalAmount: 428.0,
        status: "delivered",
        createdAt: isoAt(previousDate, 8, 5),
        updatedAt: isoAt(previousDate, 9, 8),
        tripStartedAt: isoAt(previousDate, 8, 15),
        arrivedAt: isoAt(previousDate, 8, 44),
        deliveredAt: isoAt(previousDate, 9, 8),
        failedAt: null,
        latestLocation: {
          latitude: 4.603114,
          longitude: 101.112518,
          accuracy: 18,
          source: "browser",
        },
        remark: "TF Tambun — smooth handover.",
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "hist-abc-202",
        stopMasterId: "master-tf-falim",
        routeId: "route-abc-perak-prev",
        assignedDriverId: "driver-mei-ling",
        orderNumber: "ABC-23974",
        routeDate: previousDate,
        stopNumber: 2,
        totalAmount: 131.5,
        status: "failed",
        createdAt: isoAt(previousDate, 8, 10),
        updatedAt: isoAt(previousDate, 10, 12),
        tripStartedAt: isoAt(previousDate, 8, 15),
        arrivedAt: isoAt(previousDate, 9, 52),
        deliveredAt: null,
        failedAt: isoAt(previousDate, 10, 12),
        latestLocation: {
          latitude: 4.617982,
          longitude: 101.121803,
          accuracy: 19,
          source: "browser",
        },
        remark: "TF Falim — receiving dock closed for maintenance.",
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "hist-abc-203",
        stopMasterId: "master-gunung-lang-mini",
        routeId: "route-abc-perak-prev",
        assignedDriverId: "driver-mei-ling",
        orderNumber: "ABC-23975",
        routeDate: previousDate,
        stopNumber: 3,
        totalAmount: 221.8,
        status: "delivered",
        createdAt: isoAt(previousDate, 8, 12),
        updatedAt: isoAt(previousDate, 11, 20),
        tripStartedAt: isoAt(previousDate, 8, 15),
        arrivedAt: isoAt(previousDate, 10, 38),
        deliveredAt: isoAt(previousDate, 11, 20),
        failedAt: null,
        latestLocation: {
          latitude: 4.62912,
          longitude: 101.1184,
          accuracy: 18,
          source: "browser",
        },
        remark: "Gunung Lang — mixed pallets; longer unload.",
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "hist-mm-301",
        stopMasterId: "master-hala-mini",
        routeId: "route-mini-kl-prev",
        assignedDriverId: "driver-ah-chong",
        orderNumber: "MM-23976",
        routeDate: twoDaysAgo,
        stopNumber: 1,
        totalAmount: 142.6,
        status: "delivered",
        createdAt: isoAt(twoDaysAgo, 7, 40),
        updatedAt: isoAt(twoDaysAgo, 8, 35),
        tripStartedAt: isoAt(twoDaysAgo, 7, 55),
        arrivedAt: isoAt(twoDaysAgo, 8, 18),
        deliveredAt: isoAt(twoDaysAgo, 8, 35),
        failedAt: null,
        latestLocation: {
          latitude: 3.14189,
          longitude: 101.71205,
          accuracy: 14,
          source: "browser",
        },
        remark: "Hala Mini Market — alley GPS ping logged.",
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "hist-mm-302",
        stopMasterId: "master-pudu-wholesale",
        routeId: "route-mini-kl-prev",
        assignedDriverId: "driver-ah-chong",
        orderNumber: "MM-23977",
        routeDate: twoDaysAgo,
        stopNumber: 2,
        totalAmount: 108.3,
        status: "delivered",
        createdAt: isoAt(twoDaysAgo, 7, 48),
        updatedAt: isoAt(twoDaysAgo, 9, 52),
        tripStartedAt: isoAt(twoDaysAgo, 7, 55),
        arrivedAt: isoAt(twoDaysAgo, 9, 28),
        deliveredAt: isoAt(twoDaysAgo, 9, 52),
        failedAt: null,
        latestLocation: unavailableLocation(),
        remark: "Pudu Wholesale — GPS weak under covered walkway.",
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "hist-mm-401",
        stopMasterId: "master-soon-lee",
        routeId: "route-mini-nt-prev",
        assignedDriverId: "driver-ravi",
        orderNumber: "MM-23978",
        routeDate: previousDate,
        stopNumber: 1,
        totalAmount: 151.2,
        status: "failed",
        createdAt: isoAt(previousDate, 8, 50),
        updatedAt: isoAt(previousDate, 9, 44),
        tripStartedAt: isoAt(previousDate, 9, 5),
        arrivedAt: isoAt(previousDate, 9, 28),
        deliveredAt: null,
        failedAt: isoAt(previousDate, 9, 44),
        latestLocation: unavailableLocation(),
        remark: "Soon Lee Grocer — customer requested evening slot.",
        photoNeedReasons: ["new_customer"],
      },
      stopMasterMap
    ),
    makeSeedOrder(
      {
        id: "hist-mm-402",
        stopMasterId: "master-bandar-mini",
        routeId: "route-mini-nt-prev",
        assignedDriverId: "driver-ravi",
        orderNumber: "MM-23979",
        routeDate: previousDate,
        stopNumber: 2,
        totalAmount: 58.9,
        status: "delivered",
        createdAt: isoAt(previousDate, 8, 55),
        updatedAt: isoAt(previousDate, 10, 40),
        tripStartedAt: isoAt(previousDate, 9, 5),
        arrivedAt: isoAt(previousDate, 10, 12),
        deliveredAt: isoAt(previousDate, 10, 40),
        failedAt: null,
        latestLocation: unavailableLocation(),
        remark: "Bandar Baru Mini — completed after Soon Lee attempt.",
      },
      stopMasterMap
    ),
  ];

  const store: DeliveryStore = {
    version: STORE_VERSION,
    companies: makeDemoCompanies(),
    routeDate,
    seededAt: nowIso(),
    admins,
    drivers,
    stopMasters,
    routes,
    orders,
  };

  for (const route of store.routes) {
    route.stopOrderIds = getOrdersForRoute(store, route.id).map((order) => order.id);
  }

  for (const route of store.routes) {
    if (route.startedAt && route.assignedDriverId) {
      route.events.push(
        makeEvent({
          id: `trip-${route.id}`,
          companyId: route.companyId,
          driverId: route.assignedDriverId,
          routeId: route.id,
          orderId: null,
          action: "start_trip",
          status: null,
          createdAt: route.startedAt,
          location: route.lastLocation.source === "browser" ? route.lastLocation : unavailableLocation(),
        })
      );
    }
  }

  for (const order of store.orders) {
    if (!order.assignedDriverId) continue;

    if (order.arrivedAt) {
      const event = makeEvent({
        id: `${order.id}-arrived`,
        companyId: order.companyId,
        driverId: order.assignedDriverId,
        routeId: order.routeId,
        orderId: order.id,
        action: "arrived",
        status: "arrived",
        createdAt: order.arrivedAt,
        location: order.arrivedAt === order.updatedAt ? order.latestLocation : order.latestLocation,
        remark: order.status === "arrived" ? order.remark : null,
      });
      order.events.push(event);
      const route = store.routes.find((item) => item.id === order.routeId);
      route?.events.push(event);
    }

    if (order.deliveredAt) {
      const event = makeEvent({
        id: `${order.id}-delivered`,
        companyId: order.companyId,
        driverId: order.assignedDriverId,
        routeId: order.routeId,
        orderId: order.id,
        action: "delivered",
        status: "delivered",
        createdAt: order.deliveredAt,
        location: order.latestLocation,
        remark: order.remark,
        photoName: order.photoNeedReasons.length ? `${order.customerName.toLowerCase().replaceAll(" ", "-")}.jpg` : null,
        photoDataUrl: order.id === "order-mx-001"
          ? "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='120' viewBox='0 0 160 120'%3E%3Crect width='160' height='120' fill='%23d1fae5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23065f46' font-size='16' font-family='Arial'%3EDelivery photo%3C/text%3E%3C/svg%3E"
          : null,
      });
      order.events.push(event);
      const route = store.routes.find((item) => item.id === order.routeId);
      route?.events.push(event);
    }

    if (order.failedAt) {
      const event = makeEvent({
        id: `${order.id}-failed`,
        companyId: order.companyId,
        driverId: order.assignedDriverId,
        routeId: order.routeId,
        orderId: order.id,
        action: "failed",
        status: "failed",
        createdAt: order.failedAt,
        location: order.latestLocation,
        remark: order.remark,
      });
      order.events.push(event);
      const route = store.routes.find((item) => item.id === order.routeId);
      route?.events.push(event);
    }
  }

  const appendDemoGpsRemark = (
    routeId: string,
    companyId: string,
    driverId: string,
    eventId: string,
    createdAt: string,
    lat: number,
    lng: number,
    remark: string
  ) => {
    const route = store.routes.find((r) => r.id === routeId);
    if (!route) return;
    route.events.push(
      makeEvent({
        id: eventId,
        companyId,
        driverId,
        routeId,
        orderId: null,
        action: "remark",
        status: null,
        createdAt,
        location: { latitude: lat, longitude: lng, accuracy: 14, source: "browser" },
        remark,
      })
    );
  };

  appendDemoGpsRemark(
    "route-mx-kv-today",
    DEMO_COMPANY_MX_FRUIT,
    "driver-kumar",
    "demo-gps-mx-1",
    isoMinutesAgo(188),
    3.112,
    101.62,
    "En route · GPS waypoint (approach leg)."
  );
  appendDemoGpsRemark(
    "route-mx-kv-today",
    DEMO_COMPANY_MX_FRUIT,
    "driver-kumar",
    "demo-gps-mx-2",
    isoMinutesAgo(175),
    3.115,
    101.605,
    "Location ping · traffic near Kelana corridor."
  );
  appendDemoGpsRemark(
    "route-abc-perak-today",
    DEMO_COMPANY_ABC_FROZEN,
    "driver-mei-ling",
    "demo-gps-abc-1",
    isoMinutesAgo(170),
    4.61,
    101.115,
    "Cold chain check · GPS logged between Tambun and Falim."
  );

  for (const route of store.routes) {
    route.events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    syncRouteState(route.id, store);
  }

  return store;
}

function writeStore(store: DeliveryStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota, private mode, or other storage failures — keep in-memory state for this session.
  }
}

/** Fix incomplete / legacy JSON so dashboard helpers never throw on missing arrays or fields. */
function repairStoreShape(store: DeliveryStore): boolean {
  let dirty = false;

  if (!Array.isArray(store.companies)) {
    store.companies = [];
    dirty = true;
  }
  if (!Array.isArray(store.admins)) {
    store.admins = [];
    dirty = true;
  }
  if (!Array.isArray(store.stopMasters)) {
    store.stopMasters = [];
    dirty = true;
  }
  if (!Array.isArray(store.drivers)) {
    store.drivers = [];
    dirty = true;
  }
  for (const driver of store.drivers) {
    if (typeof driver.isActive !== "boolean") {
      driver.isActive = true;
      dirty = true;
    }
  }

  if (!Array.isArray(store.orders)) {
    store.orders = [];
    dirty = true;
  }
  for (const order of store.orders) {
    if (!Array.isArray(order.photoNeedReasons)) {
      order.photoNeedReasons = [];
      dirty = true;
    }
    if (!Array.isArray(order.events)) {
      order.events = [];
      dirty = true;
    }
    if (!order.latestLocation || typeof order.latestLocation !== "object") {
      order.latestLocation = unavailableLocation();
      dirty = true;
    }
  }

  if (!Array.isArray(store.routes)) {
    store.routes = [];
    dirty = true;
  }
  for (const route of store.routes) {
    if (!Array.isArray(route.events)) {
      route.events = [];
      dirty = true;
    }
    if (!route.lastLocation || typeof route.lastLocation !== "object") {
      route.lastLocation = unavailableLocation();
      dirty = true;
    }
    if (!Array.isArray(route.stopOrderIds)) {
      route.stopOrderIds = [];
      dirty = true;
    }
  }

  return dirty;
}

function readStore(): DeliveryStore | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeliveryStore;
    if (!parsed || typeof parsed !== "object") return null;
    const ver = typeof parsed.version === "number" ? parsed.version : 0;
    if (ver === STORE_VERSION) {
      if (repairStoreShape(parsed)) {
        writeStore(parsed);
      }
      return parsed;
    }
    if (ver < STORE_VERSION) {
      const upgraded = makeSampleStore();
      writeStore(upgraded);
      return upgraded;
    }
    return null;
  } catch {
    return null;
  }
}

/** Stable in-memory demo store for SSR / server (no `localStorage`). */
let serverDemoStoreCache: DeliveryStore | null = null;

function ensureStore(): DeliveryStore {
  if (typeof window === "undefined") {
    if (!serverDemoStoreCache) {
      serverDemoStoreCache = makeSampleStore();
    }
    return cloneStore(serverDemoStoreCache);
  }

  const existing = readStore();
  if (existing) return cloneStore(existing);

  const seeded = makeSampleStore();
  writeStore(seeded);
  return cloneStore(seeded);
}

function findRoute(store: DeliveryStore, routeId: string) {
  return store.routes.find((item) => item.id === routeId) ?? null;
}

function findOrder(store: DeliveryStore, orderId: string) {
  return store.orders.find((item) => item.id === orderId) ?? null;
}

function findStopMaster(store: DeliveryStore, stopMasterId: string) {
  return store.stopMasters.find((item) => item.id === stopMasterId) ?? null;
}

function appendRouteEvent(store: DeliveryStore, routeId: string, event: DeliveryEvent) {
  const route = findRoute(store, routeId);
  if (!route) return;
  route.events.push(event);
  if (!route.startedAt && event.action !== "remark") {
    route.startedAt = event.createdAt;
  }
  route.lastEventAt = event.createdAt;
  route.lastLocation = event.location;
  syncRouteState(route.id, store);
}

function validateOrderAction(order: DeliveryOrderRow, action: DeliveryAction, remark?: string) {
  if (action === "remark") {
    if (!remark?.trim()) {
      return "Add a remark before saving.";
    }
    return null;
  }

  if (action === "arrived" && order.status !== "pending") {
    return `This stop is already ${order.status}.`;
  }

  if (action === "delivered" && (order.status === "delivered" || order.status === "failed")) {
    return `This stop is already ${order.status}.`;
  }

  if (action === "failed" && (order.status === "delivered" || order.status === "failed")) {
    return `This stop is already ${order.status}.`;
  }

  return null;
}

function applyOrderTransition(order: DeliveryOrderRow, action: DeliveryAction, createdAt: string) {
  if (!order.tripStartedAt) {
    order.tripStartedAt = createdAt;
  }

  if (action === "arrived") {
    order.status = "arrived";
    order.arrivedAt = createdAt;
  }

  if (action === "delivered") {
    order.status = "delivered";
    order.deliveredAt = createdAt;
  }

  if (action === "failed") {
    order.status = "failed";
    order.failedAt = createdAt;
  }
}

export function sliceDeliveryStoreByCompany(store: DeliveryStore, companyId: string): DeliveryStore | null {
  const company = store.companies.find((item) => item.companyId === companyId) ?? null;
  if (!company) return null;

  return {
    version: store.version,
    companies: [company],
    routeDate: store.routeDate,
    seededAt: store.seededAt,
    admins: store.admins.filter((admin) => admin.companyId === companyId),
    drivers: store.drivers.filter((driver) => driver.companyId === companyId),
    stopMasters: store.stopMasters.filter((stop) => stop.companyId === companyId),
    routes: store.routes.filter((route) => route.companyId === companyId),
    orders: store.orders.filter((order) => order.companyId === companyId),
  };
}

function tenantStoreOrUndefined(store: DeliveryStore, companyId: string): DeliveryStore | undefined {
  return sliceDeliveryStoreByCompany(store, companyId) ?? undefined;
}

/** Companies available in the demo store (for login picker). */
export function listDemoCompanies(): CompanyRow[] {
  if (typeof window === "undefined") return [];
  return [...ensureStore().companies].sort((a, b) => a.companyName.localeCompare(b.companyName));
}

export function getCompanyByCode(code: string): CompanyRow | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  return ensureStore().companies.find((c) => c.companyCode.toUpperCase() === normalized) ?? null;
}

/** Tenant-scoped snapshot for the signed-in company. */
export function getDeliveryStoreSnapshot(companyId: string | null): DeliveryStore | null {
  if (typeof window === "undefined") return null;
  if (!companyId) return null;
  const slice = sliceDeliveryStoreByCompany(ensureStore(), companyId);
  return slice ? cloneStore(slice) : null;
}

export function resetDeliveryStore(): DeliveryStore | null {
  if (typeof window === "undefined") return null;
  const seeded = makeSampleStore();
  writeStore(seeded);
  return cloneStore(seeded);
}

export function getDriverByUsername(username: string, companyId: string) {
  const normalized = username.trim().toLowerCase();
  return (
    ensureStore().drivers.find(
      (driver) => driver.companyId === companyId && driver.username.toLowerCase() === normalized
    ) ?? null
  );
}

export function getAdminByUsername(username: string, companyId: string) {
  const normalized = username.trim().toLowerCase();
  return (
    ensureStore().admins.find(
      (admin) => admin.companyId === companyId && admin.username.toLowerCase() === normalized
    ) ?? null
  );
}

export type DriverAccountInput = {
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

export function createDriverAccount(companyId: string, input: DriverAccountInput): DeliveryStoreResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Unavailable outside the browser." };
  }

  const store = ensureStore();
  if (!store.companies.some((c) => c.companyId === companyId)) {
    return { ok: false, error: "Unknown company.", store };
  }

  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();
  const password = input.password.trim();

  if (!name || !username || !password) {
    return { ok: false, error: "Name, username, and password are required.", store: tenantStoreOrUndefined(store, companyId) };
  }

  const usernameTaken =
    store.drivers.some(
      (driver) => driver.companyId === companyId && driver.username.toLowerCase() === username
    ) ||
    store.admins.some((admin) => admin.companyId === companyId && admin.username.toLowerCase() === username);

  if (usernameTaken) {
    return { ok: false, error: "Username already exists in this company.", store: tenantStoreOrUndefined(store, companyId) };
  }

  store.drivers.push({
    id: nextId("driver"),
    companyId,
    name,
    username,
    password,
    phone: input.phone.trim() || "-",
    vehicle: input.vehicle.trim() || "Van",
    zone: input.zone.trim() || "General Route",
    shiftStart: input.shiftStart.trim() || "08:00",
    shiftEnd: input.shiftEnd.trim() || "17:00",
    createdAt: nowIso(),
    isActive: input.isActive,
  });

  writeStore(store);
  return { ok: true, store: cloneStore(sliceDeliveryStoreByCompany(store, companyId)!) };
}

export function updateDriverAccount(
  companyId: string,
  driverId: string,
  input: DriverAccountInput
): DeliveryStoreResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Unavailable outside the browser." };
  }

  const store = ensureStore();
  if (!store.companies.some((c) => c.companyId === companyId)) {
    return { ok: false, error: "Unknown company.", store };
  }

  const driver = store.drivers.find((d) => d.id === driverId);
  if (!driver || driver.companyId !== companyId) {
    return { ok: false, error: "Driver not found in this company.", store: tenantStoreOrUndefined(store, companyId) };
  }

  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();
  const passwordNext = input.password.trim() ? input.password.trim() : driver.password;

  if (!name || !username) {
    return { ok: false, error: "Name and username are required.", store: tenantStoreOrUndefined(store, companyId) };
  }

  const usernameTaken =
    store.drivers.some(
      (d) =>
        d.companyId === companyId &&
        d.id !== driverId &&
        d.username.toLowerCase() === username
    ) || store.admins.some((admin) => admin.companyId === companyId && admin.username.toLowerCase() === username);

  if (usernameTaken) {
    return { ok: false, error: "Username already exists in this company.", store: tenantStoreOrUndefined(store, companyId) };
  }

  driver.name = name;
  driver.username = username;
  driver.password = passwordNext;
  driver.phone = input.phone.trim() || "-";
  driver.vehicle = input.vehicle.trim() || "Van";
  driver.zone = input.zone.trim() || "General Route";
  driver.shiftStart = input.shiftStart.trim() || "08:00";
  driver.shiftEnd = input.shiftEnd.trim() || "17:00";
  driver.isActive = input.isActive;

  writeStore(store);
  return { ok: true, store: cloneStore(sliceDeliveryStoreByCompany(store, companyId)!) };
}

export function createStopMaster(companyId: string, input: StopMasterInput): CreateStopMasterResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Unavailable outside the browser." };
  }

  const store = ensureStore();
  if (!store.companies.some((c) => c.companyId === companyId)) {
    return { ok: false, error: "Unknown company.", store };
  }

  const parsed = parseStopMasterInput(input);
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      store: tenantStoreOrUndefined(store, companyId),
    };
  }

  const { customerName, address } = parsed.value;
  const duplicate = store.stopMasters.find(
    (stop) =>
      stop.companyId === companyId &&
      stop.customerName.toLowerCase() === customerName.toLowerCase() &&
      stop.address.toLowerCase() === address.toLowerCase()
  );

  if (duplicate) {
    return {
      ok: false,
      error: "A saved stop with the same customer and address already exists.",
      store: tenantStoreOrUndefined(store, companyId),
    };
  }

  const stopMasterId = nextId("stop-master");
  const createdAt = nowIso();
  store.stopMasters.unshift({
    id: stopMasterId,
    companyId,
    ...parsed.value,
    createdAt,
    updatedAt: createdAt,
  });

  writeStore(store);
  return { ok: true, store: cloneStore(sliceDeliveryStoreByCompany(store, companyId)!), stopMasterId };
}

export function updateStopMaster(
  companyId: string,
  stopMasterId: string,
  input: StopMasterInput
): UpdateStopMasterResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Unavailable outside the browser." };
  }

  const store = ensureStore();
  const stopMaster = findStopMaster(store, stopMasterId);
  if (!stopMaster || stopMaster.companyId !== companyId) {
    return { ok: false, error: "Saved stop not found.", store: tenantStoreOrUndefined(store, companyId) };
  }

  const parsed = parseStopMasterInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, store: tenantStoreOrUndefined(store, companyId) };
  }

  const duplicate = store.stopMasters.find(
    (stop) =>
      stop.companyId === companyId &&
      stop.id !== stopMasterId &&
      stop.customerName.toLowerCase() === parsed.value.customerName.toLowerCase() &&
      stop.address.toLowerCase() === parsed.value.address.toLowerCase()
  );

  if (duplicate) {
    return {
      ok: false,
      error: "A saved stop with the same customer and address already exists.",
      store: tenantStoreOrUndefined(store, companyId),
    };
  }

  Object.assign(stopMaster, parsed.value, { updatedAt: nowIso() });

  for (const order of store.orders) {
    if (order.companyId !== companyId || order.stopMasterId !== stopMasterId) continue;
    order.customerName = stopMaster.customerName;
    order.area = stopMaster.area;
    order.address = stopMaster.address;
    order.contactNumber = stopMaster.contactNumber;
    order.googleMapsLink = stopMaster.googleMapsLink;
    order.latitude = stopMaster.latitude;
    order.longitude = stopMaster.longitude;
    order.notes = stopMaster.notes;
    order.updatedAt = nowIso();
  }

  writeStore(store);
  return { ok: true, store: cloneStore(sliceDeliveryStoreByCompany(store, companyId)!), stopMasterId };
}

function assertAssignableDriver(store: DeliveryStore, companyId: string, driverId: string | null): string | null {
  if (!driverId) return null;
  const driver = store.drivers.find((item) => item.id === driverId);
  if (!driver || driver.companyId !== companyId) {
    return "Driver not found in this company.";
  }
  if (!driver.isActive) {
    return "Cannot assign routes or stops to a deactivated driver. Activate the account first.";
  }
  return null;
}

export function assignSavedStopToDriver(input: {
  companyId: string;
  stopMasterId: string;
  driverId: string | null;
  routeDate: string;
}): DeliveryStoreResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Unavailable outside the browser." };
  }

  const store = ensureStore();
  const routeDate = input.routeDate.trim() || todayRouteDate();
  const stopMaster = findStopMaster(store, input.stopMasterId);
  if (!stopMaster || stopMaster.companyId !== input.companyId) {
    return { ok: false, error: "Saved stop not found.", store: tenantStoreOrUndefined(store, input.companyId) };
  }

  if (input.driverId) {
    const assignError = assertAssignableDriver(store, input.companyId, input.driverId);
    if (assignError) {
      return { ok: false, error: assignError, store: tenantStoreOrUndefined(store, input.companyId) };
    }
  }

  upsertAssignmentFromMaster(store, stopMaster.id, input.driverId, routeDate);
  writeStore(store);
  return { ok: true, store: cloneStore(sliceDeliveryStoreByCompany(store, input.companyId)!) };
}

export function assignRouteGroupToDriver(input: {
  companyId: string;
  routeGroup: string;
  driverId: string | null;
  routeDate: string;
}): DeliveryStoreResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Unavailable outside the browser." };
  }

  const store = ensureStore();
  const routeGroup = input.routeGroup.trim();
  const routeDate = input.routeDate.trim() || todayRouteDate();

  if (!routeGroup) {
    return { ok: false, error: "Select a route group first.", store: tenantStoreOrUndefined(store, input.companyId) };
  }

  if (input.driverId) {
    const assignError = assertAssignableDriver(store, input.companyId, input.driverId);
    if (assignError) {
      return { ok: false, error: assignError, store: tenantStoreOrUndefined(store, input.companyId) };
    }
  }

  const masters = store.stopMasters.filter(
    (stop) =>
      stop.companyId === input.companyId && stop.defaultRouteGroup.toLowerCase() === routeGroup.toLowerCase()
  );

  if (masters.length === 0) {
    return { ok: false, error: "No saved stops belong to that route group yet.", store: tenantStoreOrUndefined(store, input.companyId) };
  }

  for (const master of masters) {
    upsertAssignmentFromMaster(store, master.id, input.driverId, routeDate);
  }

  writeStore(store);
  return { ok: true, store: cloneStore(sliceDeliveryStoreByCompany(store, input.companyId)!) };
}

export function assignRouteToDriver(
  companyId: string,
  routeId: string,
  driverId: string | null
): DeliveryStoreResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Unavailable outside the browser." };
  }

  const store = ensureStore();
  const route = findRoute(store, routeId);
  if (!route || route.companyId !== companyId) {
    return { ok: false, error: "Route not found.", store: tenantStoreOrUndefined(store, companyId) };
  }

  if (driverId) {
    const assignError = assertAssignableDriver(store, companyId, driverId);
    if (assignError) {
      return { ok: false, error: assignError, store: tenantStoreOrUndefined(store, companyId) };
    }
  }

  for (const order of getOrdersForRoute(store, route.id)) {
    if (order.companyId !== companyId) continue;
    order.assignedDriverId = driverId;
    order.updatedAt = nowIso();
  }

  syncRouteState(route.id, store);
  writeStore(store);
  return { ok: true, store: cloneStore(sliceDeliveryStoreByCompany(store, companyId)!) };
}

export function assignStopToDriver(
  companyId: string,
  orderId: string,
  driverId: string | null
): DeliveryStoreResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Unavailable outside the browser." };
  }

  const store = ensureStore();
  const order = findOrder(store, orderId);
  if (!order || order.companyId !== companyId) {
    return { ok: false, error: "Stop not found.", store: tenantStoreOrUndefined(store, companyId) };
  }

  if (driverId) {
    const assignError = assertAssignableDriver(store, companyId, driverId);
    if (assignError) {
      return { ok: false, error: assignError, store: tenantStoreOrUndefined(store, companyId) };
    }
  }

  order.assignedDriverId = driverId;
  order.updatedAt = nowIso();
  syncRouteState(order.routeId, store);
  writeStore(store);
  return { ok: true, store: cloneStore(sliceDeliveryStoreByCompany(store, companyId)!) };
}

export async function recordTripStart(
  companyId: string,
  routeId: string,
  driverId: string
): Promise<DeliveryStoreResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Unavailable outside the browser." };
  }

  const store = ensureStore();
  const route = findRoute(store, routeId);
  if (!route || route.companyId !== companyId) {
    return { ok: false, error: "Route not found.", store: tenantStoreOrUndefined(store, companyId) };
  }

  const driver = store.drivers.find((d) => d.id === driverId);
  if (!driver || driver.companyId !== companyId) {
    return { ok: false, error: "Driver not found in this company.", store: tenantStoreOrUndefined(store, companyId) };
  }

  if (!driver.isActive) {
    return { ok: false, error: "This driver account has been deactivated.", store: tenantStoreOrUndefined(store, companyId) };
  }

  const assignedStops = getOrdersForDriverOnRoute(store, driverId, routeId);
  if (!assignedStops.length) {
    return { ok: false, error: "This route has no stops assigned to your account.", store: tenantStoreOrUndefined(store, companyId) };
  }

  if (assignedStops.some((o) => o.companyId !== companyId)) {
    return { ok: false, error: "Invalid route assignment.", store: tenantStoreOrUndefined(store, companyId) };
  }

  if (route.startedAt) {
    return { ok: false, error: "Trip already started.", store: tenantStoreOrUndefined(store, companyId) };
  }

  const createdAt = nowIso();
  const location = await captureCurrentLocation();
  const event = makeEvent({
    id: nextId("trip"),
    companyId: route.companyId,
    driverId,
    routeId,
    orderId: null,
    action: "start_trip",
    status: null,
    createdAt,
    location,
  });

  route.startedAt = createdAt;
  appendRouteEvent(store, routeId, event);
  writeStore(store);
  return { ok: true, store: cloneStore(sliceDeliveryStoreByCompany(store, companyId)!) };
}

export async function recordOrderAction(input: {
  companyId: string;
  orderId: string;
  driverId: string;
  action: Exclude<DeliveryAction, "start_trip">;
  remark?: string;
  photoDataUrl?: string | null;
  photoName?: string | null;
}): Promise<DeliveryStoreResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Unavailable outside the browser." };
  }

  const store = ensureStore();
  const order = findOrder(store, input.orderId);
  if (!order || order.companyId !== input.companyId) {
    return { ok: false, error: "Stop not found.", store: tenantStoreOrUndefined(store, input.companyId) };
  }

  const route = findRoute(store, order.routeId);
  if (!route || route.companyId !== input.companyId) {
    return { ok: false, error: "Route not found.", store: tenantStoreOrUndefined(store, input.companyId) };
  }

  const driver = store.drivers.find((d) => d.id === input.driverId);
  if (!driver || driver.companyId !== input.companyId) {
    return { ok: false, error: "Driver not found in this company.", store: tenantStoreOrUndefined(store, input.companyId) };
  }

  if (!driver.isActive) {
    return { ok: false, error: "This driver account has been deactivated.", store: tenantStoreOrUndefined(store, input.companyId) };
  }

  if (order.assignedDriverId !== input.driverId) {
    return { ok: false, error: "You can only update stops assigned to your account.", store: tenantStoreOrUndefined(store, input.companyId) };
  }

  const validationError = validateOrderAction(order, input.action, input.remark);
  if (validationError) {
    return { ok: false, error: validationError, store: tenantStoreOrUndefined(store, input.companyId) };
  }

  const createdAt = nowIso();
  const location = await captureCurrentLocation();
  const nextStatus = input.action === "remark" ? order.status : input.action;
  const event = makeEvent({
    id: nextId("order"),
    companyId: order.companyId,
    driverId: input.driverId,
    routeId: route.id,
    orderId: order.id,
    action: input.action,
    status: nextStatus,
    createdAt,
    location,
    remark: input.remark?.trim() || null,
    photoDataUrl: input.photoDataUrl ?? null,
    photoName: input.photoName ?? null,
  });

  applyOrderTransition(order, input.action, createdAt);
  if (event.remark) {
    order.remark = event.remark;
  }
  order.updatedAt = createdAt;
  order.latestLocation = location;
  order.events.push(event);

  appendRouteEvent(store, route.id, event);
  writeStore(store);
  return { ok: true, store: cloneStore(sliceDeliveryStoreByCompany(store, input.companyId)!) };
}

export function photoNeedSummary(reasons: PhotoNeedReason[]) {
  return reasons.length > 0;
}
