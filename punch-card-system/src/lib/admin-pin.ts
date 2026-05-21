const SESSION_KEY = "punch-card-admin-pin-session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Simple gate PIN — override with NEXT_PUBLIC_ADMIN_PIN in production. */
export const ADMIN_PIN =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ADMIN_PIN?.trim()) || "520123";

type PinSession = { verifiedAt: number };

function readSession(): PinSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PinSession;
    if (!parsed || typeof parsed.verifiedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isAdminPinSessionValid(): boolean {
  const session = readSession();
  if (!session) return false;
  return Date.now() - session.verifiedAt < SESSION_TTL_MS;
}

export function saveAdminPinSession(): void {
  if (typeof window === "undefined") return;
  const payload: PinSession = { verifiedAt: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export function clearAdminPinSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function verifyAdminPin(pin: string): boolean {
  return pin.trim() === ADMIN_PIN;
}
