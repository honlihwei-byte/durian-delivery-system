import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "musang_admin_session";

export function getAdminSessionSecret(): string | undefined {
  return process.env.ADMIN_SESSION_SECRET;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = getAdminSessionSecret();
  if (!secret) return false;

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value === secret;
}
