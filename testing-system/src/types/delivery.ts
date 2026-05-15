export type DeliveryStatus = "pending" | "arrived" | "delivered" | "failed";

export type DeliveryAction = "start_trip" | "arrived" | "delivered" | "failed" | "remark";

export type RouteStatus = "unassigned" | "assigned" | "mixed" | "on_route" | "completed";

export type PhotoNeedReason =
  | "new_customer"
  | "high_value_order"
  | "complaint_customer"
  | "random_check";

export type GeoPoint = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  source: "browser" | "unavailable";
};

/** Tenant / organization — all operational data is scoped by companyId. */
export type CompanyRow = {
  companyId: string;
  companyName: string;
  companyCode: string;
};

export type AdminAccountRow = {
  userId: string;
  companyId: string;
  name: string;
  username: string;
  password: string;
};

export type DriverRow = {
  id: string;
  companyId: string;
  name: string;
  username: string;
  password: string;
  phone: string;
  vehicle: string;
  zone: string;
  shiftStart: string;
  shiftEnd: string;
  /** When false, driver cannot sign in; assignments keep using `id` (driverId). */
  isActive: boolean;
  createdAt: string;
};

export type StopMasterRow = {
  id: string;
  companyId: string;
  customerName: string;
  area: string;
  address: string;
  contactNumber: string;
  googleMapsLink: string | null;
  latitude: number | null;
  longitude: number | null;
  defaultRouteGroup: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryEvent = {
  id: string;
  companyId: string;
  driverId: string;
  routeId: string;
  orderId: string | null;
  action: DeliveryAction;
  status: DeliveryStatus | null;
  remark: string | null;
  createdAt: string;
  location: GeoPoint;
  photoDataUrl: string | null;
  photoName: string | null;
};

export type DeliveryRouteRow = {
  id: string;
  companyId: string;
  routeName: string;
  routeDate: string;
  assignedDriverId: string | null;
  status: RouteStatus;
  stopOrderIds: string[];
  startedAt: string | null;
  lastEventAt: string | null;
  lastLocation: GeoPoint;
  events: DeliveryEvent[];
};

export type DeliveryOrderRow = {
  id: string;
  companyId: string;
  stopMasterId: string;
  routeId: string;
  assignedDriverId: string | null;
  orderNumber: string;
  routeDate: string;
  stopNumber: number;
  customerName: string;
  area: string;
  address: string;
  contactNumber: string;
  googleMapsLink: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  totalAmount: number;
  status: DeliveryStatus;
  photoNeedReasons: PhotoNeedReason[];
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  tripStartedAt: string | null;
  arrivedAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  latestLocation: GeoPoint;
  events: DeliveryEvent[];
};

export type DeliveryStore = {
  version: number;
  companies: CompanyRow[];
  routeDate: string;
  seededAt: string;
  admins: AdminAccountRow[];
  drivers: DriverRow[];
  stopMasters: StopMasterRow[];
  routes: DeliveryRouteRow[];
  orders: DeliveryOrderRow[];
};

export type DemoSession =
  | {
      role: "admin";
      userId: string;
      companyId: string;
      companyName: string;
      companyCode: string;
      name: string;
      username: string;
      loginAt: string;
    }
  | {
      role: "driver";
      userId: string;
      driverId: string;
      companyId: string;
      companyName: string;
      companyCode: string;
      name: string;
      username: string;
      loginAt: string;
    };

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "Pending",
  arrived: "Arrived",
  delivered: "Delivered",
  failed: "Failed",
};

export const ROUTE_STATUS_LABEL: Record<RouteStatus, string> = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  mixed: "Mixed",
  on_route: "On Route",
  completed: "Completed",
};

export const PHOTO_NEED_LABEL: Record<PhotoNeedReason, string> = {
  new_customer: "Need Photo · New Customer",
  high_value_order: "Need Photo · High Value",
  complaint_customer: "Need Photo · Complaint",
  random_check: "Need Photo · Random Check",
};
