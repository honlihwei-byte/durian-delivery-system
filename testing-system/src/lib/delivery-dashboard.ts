import type {
  DeliveryAction,
  DeliveryEvent,
  DeliveryOrderRow,
  DeliveryRouteRow,
  DeliveryStatus,
  DeliveryStore,
  DriverRow,
  StopMasterRow,
} from "@/types/delivery";

const TARGET_STOP_MINUTES = 20;
const LONG_STOP_MINUTES = 35;

export type DriverProgress = {
  routeCount: number;
  totalStops: number;
  pending: number;
  arrived: number;
  delivered: number;
  failed: number;
  completionPercent: number;
  activeStops: number;
  startedAt: string | null;
  lastEventAt: string | null;
  hasGps: boolean;
  averageDeliveryMinutes: number | null;
  totalIdleMinutes: number;
  abnormalLongStopCount: number;
};

export type StopTimeMetrics = {
  arrivalToDeliveryMinutes: number | null;
  totalTimeAtStopMinutes: number | null;
  delayMinutes: number | null;
};

export type TimelineEntry = {
  id: string;
  createdAt: string;
  routeDate: string | null;
  driverId: string;
  routeId: string;
  routeName: string | null;
  orderId: string | null;
  orderNumber: string | null;
  customerName: string | null;
  action: DeliveryAction;
  status: DeliveryStatus | null;
  remark: string | null;
  hasGps: boolean;
  photoAttached: boolean;
};

export type DashboardAlert = {
  id: string;
  type:
    | "driver_stopped_too_long"
    | "order_not_updated"
    | "failed_delivery"
    | "gps_missing"
    | "long_stop";
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  driverId: string;
  orderId: string | null;
  createdAt: string;
};

export type DailyReportRow = {
  driverId: string;
  driverName: string;
  routeCount: number;
  totalStops: number;
  delivered: number;
  arrived: number;
  pending: number;
  failed: number;
  flaggedStops: number;
  completionPercent: number;
  salesValue: number;
  lastUpdateAt: string | null;
  averageDeliveryMinutes: number | null;
  totalIdleMinutes: number;
  abnormalLongStops: number;
};

export type RouteProgress = {
  routeId: string;
  routeName: string;
  routeDate: string;
  assignedDriverId: string | null;
  totalStops: number;
  delivered: number;
  arrived: number;
  pending: number;
  failed: number;
  completionPercent: number;
  startedAt: string | null;
  lastEventAt: string | null;
};

export type StopHistoryRecord = {
  orderId: string;
  routeDate: string;
  routeName: string;
  driverId: string | null;
  driverName: string;
  status: DeliveryStatus;
  remark: string | null;
  arrivalToDeliveryMinutes: number | null;
  totalTimeAtStopMinutes: number | null;
  delayMinutes: number | null;
  updatedAt: string;
};

export type StopHistorySummary = {
  stopMasterId: string;
  customerName: string;
  area: string;
  address: string;
  contactNumber: string;
  defaultRouteGroup: string;
  notes: string;
  totalVisits: number;
  deliveredCount: number;
  failedCount: number;
  averageDeliveryMinutes: number | null;
  averageStopMinutes: number | null;
  driversDeliveredBefore: string[];
  remarksHistory: Array<{
    id: string;
    routeDate: string;
    driverName: string;
    remark: string;
  }>;
  pastRecords: StopHistoryRecord[];
};

export type RouteAnalyticsRow = {
  routeId: string;
  routeName: string;
  routeDate: string;
  totalStops: number;
  delivered: number;
  failed: number;
  averageStopMinutes: number | null;
  averageDelayMinutes: number | null;
  lastUpdateAt: string | null;
};

function minutesSince(iso: string | null) {
  if (!iso) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

function minutesBetween(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
  return diff >= 0 ? diff : null;
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function getRoutesForDate(store: DeliveryStore, routeDate: string) {
  return [...store.routes]
    .filter((route) => route.routeDate === routeDate)
    .sort((a, b) => a.routeName.localeCompare(b.routeName));
}

export function getOrdersForDate(store: DeliveryStore, routeDate: string) {
  return [...store.orders]
    .filter((order) => order.routeDate === routeDate)
    .sort((a, b) => a.routeId.localeCompare(b.routeId) || a.stopNumber - b.stopNumber);
}

export function getOrdersForRoute(store: DeliveryStore, routeId: string) {
  return [...store.orders]
    .filter((order) => order.routeId === routeId)
    .sort((a, b) => a.stopNumber - b.stopNumber);
}

export function getOrdersForDriver(store: DeliveryStore, driverId: string, routeDate = store.routeDate) {
  return [...store.orders]
    .filter((order) => order.assignedDriverId === driverId && order.routeDate === routeDate)
    .sort((a, b) => a.routeId.localeCompare(b.routeId) || a.stopNumber - b.stopNumber);
}

export function getOrdersForDriverOnRoute(store: DeliveryStore, driverId: string, routeId: string) {
  return getOrdersForRoute(store, routeId).filter((order) => order.assignedDriverId === driverId);
}

export function getRoutesForDriver(store: DeliveryStore, driverId: string, routeDate = store.routeDate) {
  return [...store.routes].filter(
    (route) =>
      route.routeDate === routeDate &&
      getOrdersForDriverOnRoute(store, driverId, route.id).length > 0
  );
}

export function getRouteById(store: DeliveryStore, routeId: string) {
  return store.routes.find((route) => route.id === routeId) ?? null;
}

export function getDriverById(store: DeliveryStore, driverId: string) {
  return store.drivers.find((driver) => driver.id === driverId) ?? null;
}

export function getStopMasterById(store: DeliveryStore, stopMasterId: string) {
  return store.stopMasters.find((stop) => stop.id === stopMasterId) ?? null;
}

export function getStopTimeMetrics(order: DeliveryOrderRow): StopTimeMetrics {
  const arrivalToDeliveryMinutes = minutesBetween(order.arrivedAt, order.deliveredAt);
  const endAt = order.deliveredAt ?? order.failedAt ?? (order.status === "arrived" ? order.updatedAt : null);
  const totalTimeAtStopMinutes = minutesBetween(order.arrivedAt, endAt);
  const delayMinutes =
    totalTimeAtStopMinutes === null ? null : Math.max(0, totalTimeAtStopMinutes - TARGET_STOP_MINUTES);

  return {
    arrivalToDeliveryMinutes,
    totalTimeAtStopMinutes,
    delayMinutes,
  };
}

export function getRouteProgress(store: DeliveryStore, routeId: string): RouteProgress {
  const route = getRouteById(store, routeId);
  const orders = getOrdersForRoute(store, routeId);

  const progress: RouteProgress = {
    routeId,
    routeName: route?.routeName ?? "Route",
    routeDate: route?.routeDate ?? store.routeDate,
    assignedDriverId: route?.assignedDriverId ?? null,
    totalStops: orders.length,
    pending: 0,
    arrived: 0,
    delivered: 0,
    failed: 0,
    completionPercent: 0,
    startedAt: route?.startedAt ?? null,
    lastEventAt: route?.lastEventAt ?? null,
  };

  for (const order of orders) {
    progress[order.status] += 1;
  }

  progress.completionPercent =
    progress.totalStops === 0
      ? 0
      : Math.round(((progress.delivered + progress.failed) / progress.totalStops) * 100);

  return progress;
}

function getDriverIdleMinutes(orders: DeliveryOrderRow[]) {
  const events = orders
    .flatMap((order) =>
      order.events.filter((event) => event.action === "arrived" || event.action === "delivered" || event.action === "failed")
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let total = 0;
  for (let index = 1; index < events.length; index += 1) {
    const previous = events[index - 1];
    const current = events[index];
    if (
      (previous.action === "delivered" || previous.action === "failed") &&
      current.action === "arrived"
    ) {
      const gap = minutesBetween(previous.createdAt, current.createdAt);
      if (gap) {
        total += gap;
      }
    }
  }
  return total;
}

export function getDriverProgress(store: DeliveryStore, driverId: string, routeDate = store.routeDate): DriverProgress {
  const routes = getRoutesForDriver(store, driverId, routeDate);
  const orders = getOrdersForDriver(store, driverId, routeDate);
  const deliveredStopMinutes = orders
    .map((order) => getStopTimeMetrics(order).arrivalToDeliveryMinutes)
    .filter((value): value is number => value !== null);

  const progress: DriverProgress = {
    routeCount: routes.length,
    totalStops: orders.length,
    pending: 0,
    arrived: 0,
    delivered: 0,
    failed: 0,
    completionPercent: 0,
    activeStops: 0,
    startedAt: null,
    lastEventAt: null,
    hasGps: false,
    averageDeliveryMinutes: average(deliveredStopMinutes),
    totalIdleMinutes: getDriverIdleMinutes(orders),
    abnormalLongStopCount: orders.filter((order) => {
      const metrics = getStopTimeMetrics(order);
      return (metrics.totalTimeAtStopMinutes ?? 0) >= LONG_STOP_MINUTES;
    }).length,
  };

  for (const order of orders) {
    progress[order.status] += 1;
    progress.hasGps = progress.hasGps || order.latestLocation.source === "browser";
    if (!progress.lastEventAt || new Date(order.updatedAt).getTime() > new Date(progress.lastEventAt).getTime()) {
      progress.lastEventAt = order.updatedAt;
    }
  }

  for (const route of routes) {
    if (route.startedAt) {
      if (!progress.startedAt || new Date(route.startedAt).getTime() < new Date(progress.startedAt).getTime()) {
        progress.startedAt = route.startedAt;
      }
    }

    if (route.lastEventAt) {
      if (!progress.lastEventAt || new Date(route.lastEventAt).getTime() > new Date(progress.lastEventAt).getTime()) {
        progress.lastEventAt = route.lastEventAt;
      }
    }

    progress.hasGps =
      progress.hasGps ||
      route.lastLocation.source === "browser" ||
      route.events.some((event) => event.location.source === "browser");
  }

  progress.activeStops = progress.pending + progress.arrived;
  progress.completionPercent =
    progress.totalStops === 0
      ? 0
      : Math.round(((progress.delivered + progress.failed) / progress.totalStops) * 100);

  return progress;
}

function timelineEntryFromEvent(store: DeliveryStore, event: DeliveryEvent): TimelineEntry {
  const route = getRouteById(store, event.routeId);
  const order = event.orderId
    ? store.orders.find((item) => item.id === event.orderId) ?? null
    : null;

  return {
    id: event.id,
    createdAt: event.createdAt,
    routeDate: route?.routeDate ?? order?.routeDate ?? null,
    driverId: event.driverId,
    routeId: event.routeId,
    routeName: route?.routeName ?? null,
    orderId: event.orderId,
    orderNumber: order?.orderNumber ?? null,
    customerName: order?.customerName ?? null,
    action: event.action,
    status: event.status,
    remark: event.remark,
    hasGps: event.location.source === "browser",
    photoAttached: Boolean(event.photoDataUrl),
  };
}

export function getDeliveryTimeline(store: DeliveryStore, routeDate = store.routeDate) {
  const entries: TimelineEntry[] = [];

  for (const route of store.routes) {
    if (route.routeDate !== routeDate) continue;
    for (const event of route.events) {
      entries.push(timelineEntryFromEvent(store, event));
    }
  }

  for (const order of store.orders) {
    if (order.routeDate !== routeDate) continue;
    for (const event of order.events) {
      entries.push(timelineEntryFromEvent(store, event));
    }
  }

  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function latestOrderEvent(order: DeliveryOrderRow) {
  return [...order.events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
}

export function getDashboardAlerts(store: DeliveryStore, routeDate = store.routeDate) {
  const alerts: DashboardAlert[] = [];
  const todaysRoutes = getRoutesForDate(store, routeDate);
  const todaysOrders = getOrdersForDate(store, routeDate);

  for (const route of todaysRoutes) {
    const routeProgress = getRouteProgress(store, route.id);
    if (route.startedAt && routeProgress.pending + routeProgress.arrived > 0 && minutesSince(route.lastEventAt) >= 60) {
      alerts.push({
        id: `stopped-${route.id}`,
        type: "driver_stopped_too_long",
        title: "Driver stopped too long",
        description: `No update for ${minutesSince(route.lastEventAt)} minutes while the route is still active.`,
        severity: "high",
        driverId: route.assignedDriverId ?? "unassigned",
        orderId: null,
        createdAt: route.lastEventAt ?? route.startedAt,
      });
    }
  }

  for (const order of todaysOrders) {
    const ageMinutes = minutesSince(order.updatedAt);
    const metrics = getStopTimeMetrics(order);

    if ((order.status === "pending" || order.status === "arrived") && ageMinutes >= 90) {
      alerts.push({
        id: `stale-${order.id}`,
        type: "order_not_updated",
        title: "Stop not updated",
        description: `${order.orderNumber} has no fresh status update for ${ageMinutes} minutes.`,
        severity: "medium",
        driverId: order.assignedDriverId ?? "unassigned",
        orderId: order.id,
        createdAt: order.updatedAt,
      });
    }

    if (order.status === "failed" && order.failedAt) {
      alerts.push({
        id: `failed-${order.id}`,
        type: "failed_delivery",
        title: "Failed delivery",
        description: `${order.customerName} needs follow-up after a failed attempt.`,
        severity: "high",
        driverId: order.assignedDriverId ?? "unassigned",
        orderId: order.id,
        createdAt: order.failedAt,
      });
    }

    if ((metrics.totalTimeAtStopMinutes ?? 0) >= LONG_STOP_MINUTES) {
      alerts.push({
        id: `long-stop-${order.id}`,
        type: "long_stop",
        title: "Abnormal long stop",
        description: `${order.customerName} has consumed ${metrics.totalTimeAtStopMinutes} minutes on site.`,
        severity: "medium",
        driverId: order.assignedDriverId ?? "unassigned",
        orderId: order.id,
        createdAt: order.updatedAt,
      });
    }

    const lastEvent = latestOrderEvent(order);
    if (lastEvent && lastEvent.location.source !== "browser") {
      alerts.push({
        id: `gps-${order.id}`,
        type: "gps_missing",
        title: "GPS missing",
        description: `${order.customerName} was updated without browser GPS coordinates.`,
        severity: "low",
        driverId: order.assignedDriverId ?? "unassigned",
        orderId: order.id,
        createdAt: lastEvent.createdAt,
      });
    }
  }

  return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getDailyReportRows(store: DeliveryStore, routeDate = store.routeDate): DailyReportRow[] {
  return store.drivers.map((driver) => {
    const routes = getRoutesForDriver(store, driver.id, routeDate);
    const orders = getOrdersForDriver(store, driver.id, routeDate);
    const progress = getDriverProgress(store, driver.id, routeDate);
    const lastUpdateAt =
      [...routes.map((route) => route.lastEventAt), ...orders.map((order) => order.updatedAt)]
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

    return {
      driverId: driver.id,
      driverName: driver.name,
      routeCount: progress.routeCount,
      totalStops: progress.totalStops,
      delivered: progress.delivered,
      arrived: progress.arrived,
      pending: progress.pending,
      failed: progress.failed,
      flaggedStops: orders.filter((order) => (order.photoNeedReasons ?? []).length > 0).length,
      completionPercent: progress.completionPercent,
      salesValue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      lastUpdateAt,
      averageDeliveryMinutes: progress.averageDeliveryMinutes,
      totalIdleMinutes: progress.totalIdleMinutes,
      abnormalLongStops: progress.abnormalLongStopCount,
    };
  });
}

export function getStopHistoryRecords(store: DeliveryStore, stopMasterId: string): StopHistoryRecord[] {
  return store.orders
    .filter((order) => order.stopMasterId === stopMasterId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((order) => {
      const route = getRouteById(store, order.routeId);
      const driver = order.assignedDriverId ? getDriverById(store, order.assignedDriverId) : null;
      const metrics = getStopTimeMetrics(order);
      return {
        orderId: order.id,
        routeDate: order.routeDate,
        routeName: route?.routeName ?? "Route",
        driverId: order.assignedDriverId,
        driverName: driver?.name ?? "Unassigned",
        status: order.status,
        remark: order.remark,
        arrivalToDeliveryMinutes: metrics.arrivalToDeliveryMinutes,
        totalTimeAtStopMinutes: metrics.totalTimeAtStopMinutes,
        delayMinutes: metrics.delayMinutes,
        updatedAt: order.updatedAt,
      };
    });
}

export function getStopHistorySummary(store: DeliveryStore, stopMasterId: string): StopHistorySummary | null {
  const stop = getStopMasterById(store, stopMasterId);
  if (!stop) return null;

  const records = getStopHistoryRecords(store, stopMasterId);
  const deliveryMinutes = records
    .map((record) => record.arrivalToDeliveryMinutes)
    .filter((value): value is number => value !== null);
  const stopMinutes = records
    .map((record) => record.totalTimeAtStopMinutes)
    .filter((value): value is number => value !== null);

  return {
    stopMasterId: stop.id,
    customerName: stop.customerName,
    area: stop.area,
    address: stop.address,
    contactNumber: stop.contactNumber,
    defaultRouteGroup: stop.defaultRouteGroup,
    notes: stop.notes,
    totalVisits: records.length,
    deliveredCount: records.filter((record) => record.status === "delivered").length,
    failedCount: records.filter((record) => record.status === "failed").length,
    averageDeliveryMinutes: average(deliveryMinutes),
    averageStopMinutes: average(stopMinutes),
    driversDeliveredBefore: Array.from(
      new Set(records.filter((record) => record.status === "delivered").map((record) => record.driverName))
    ),
    remarksHistory: records
      .filter((record) => record.remark)
      .slice(0, 6)
      .map((record) => ({
        id: record.orderId,
        routeDate: record.routeDate,
        driverName: record.driverName,
        remark: record.remark ?? "",
      })),
    pastRecords: records,
  };
}

export function getRouteAnalyticsRows(store: DeliveryStore, routeDate = store.routeDate): RouteAnalyticsRow[] {
  return getRoutesForDate(store, routeDate).map((route) => {
    const stops = getOrdersForRoute(store, route.id);
    const stopMinutes = stops
      .map((stop) => getStopTimeMetrics(stop).totalTimeAtStopMinutes)
      .filter((value): value is number => value !== null);
    const delayMinutes = stops
      .map((stop) => getStopTimeMetrics(stop).delayMinutes)
      .filter((value): value is number => value !== null);

    return {
      routeId: route.id,
      routeName: route.routeName,
      routeDate: route.routeDate,
      totalStops: stops.length,
      delivered: stops.filter((stop) => stop.status === "delivered").length,
      failed: stops.filter((stop) => stop.status === "failed").length,
      averageStopMinutes: average(stopMinutes),
      averageDelayMinutes: average(delayMinutes),
      lastUpdateAt:
        [...stops.map((stop) => stop.updatedAt), route.lastEventAt]
          .filter((value): value is string => Boolean(value))
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null,
    };
  });
}

export function getRouteCompletionLabel(route: DeliveryRouteRow | null, progress: { activeStops: number; totalStops: number }) {
  if (!route) return "Unassigned";
  if (route.status === "mixed") return "Mixed";
  if (!route.assignedDriverId) return "Unassigned";
  if (!route.startedAt) return "Assigned";
  if (progress.activeStops === 0 && progress.totalStops > 0) return "Route closed";
  return "On route";
}

export function getRouteDriverName(store: DeliveryStore, route: DeliveryRouteRow | null) {
  if (!route) return "Unassigned";
  const assignedDrivers = Array.from(
    new Set(
      getOrdersForRoute(store, route.id)
        .map((order) => order.assignedDriverId)
        .filter((driverId): driverId is string => Boolean(driverId))
    )
  );
  if (assignedDrivers.length > 1) return "Multiple drivers";
  if (!route.assignedDriverId) return "Unassigned";
  return getDriverById(store, route.assignedDriverId)?.name ?? "Unknown driver";
}

export function getStopMasters(store: DeliveryStore): StopMasterRow[] {
  return [...store.stopMasters].sort((a, b) => a.customerName.localeCompare(b.customerName));
}

export function getDrivers(store: DeliveryStore): DriverRow[] {
  return [...store.drivers].sort((a, b) => a.name.localeCompare(b.name));
}

export function getActiveDrivers(store: DeliveryStore): DriverRow[] {
  return getDrivers(store).filter((d) => d.isActive);
}
