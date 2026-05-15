import {
  getAdminByUsername,
  getCompanyByCode,
  getDriverByUsername,
} from "@/lib/delivery-demo-storage";
import type { DemoSession } from "@/types/delivery";

const SESSION_KEY = "testing-system-driver-session-v2";

/** Session payload only. Password checks read delivery store rows via `delivery-demo-storage` (localStorage). */

function nowIso() {
  return new Date().toISOString();
}

function writeSession(session: DemoSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getCurrentSession(): DemoSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoSession;
    if (!parsed || typeof parsed !== "object" || !("role" in parsed)) {
      return null;
    }
    if (!("companyId" in parsed) || typeof (parsed as { companyId?: unknown }).companyId !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCurrentSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function loginAdminSession(companyCode: string, username: string, password: string) {
  const company = getCompanyByCode(companyCode);
  if (!company) {
    return { ok: false as const, error: "Unknown company code. Try MXFRUIT, ABCFROZEN, or MINIMART." };
  }

  const admin = getAdminByUsername(username, company.companyId);
  if (!admin || admin.password !== password.trim()) {
    return { ok: false as const, error: "Incorrect admin username or password for this company." };
  }

  const session: DemoSession = {
    role: "admin",
    userId: admin.userId,
    companyId: company.companyId,
    companyName: company.companyName,
    companyCode: company.companyCode,
    name: admin.name,
    username: admin.username,
    loginAt: nowIso(),
  };
  writeSession(session);
  return { ok: true as const, session };
}

export function loginDriverSession(companyCode: string, username: string, password: string) {
  const company = getCompanyByCode(companyCode);
  if (!company) {
    return { ok: false as const, error: "Unknown company code. Try MXFRUIT, ABCFROZEN, or MINIMART." };
  }

  const driver = getDriverByUsername(username, company.companyId);
  if (!driver) {
    return { ok: false as const, error: "Incorrect driver username or password for this company." };
  }
  if (!driver.isActive) {
    return { ok: false as const, error: "This driver account has been deactivated. Ask your admin to reactivate it." };
  }
  if (driver.password !== password.trim()) {
    return { ok: false as const, error: "Incorrect driver username or password for this company." };
  }

  const session: DemoSession = {
    role: "driver",
    userId: driver.id,
    driverId: driver.id,
    companyId: company.companyId,
    companyName: company.companyName,
    companyCode: company.companyCode,
    name: driver.name,
    username: driver.username,
    loginAt: nowIso(),
  };
  writeSession(session);
  return { ok: true as const, session };
}

export function isAdminSession(session: DemoSession | null): session is Extract<DemoSession, { role: "admin" }> {
  return session?.role === "admin";
}

export function isDriverSession(session: DemoSession | null): session is Extract<DemoSession, { role: "driver" }> {
  return session?.role === "driver";
}
