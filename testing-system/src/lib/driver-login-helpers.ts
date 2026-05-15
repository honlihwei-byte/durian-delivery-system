import type { DriverRow } from "@/types/delivery";

/**
 * Driver credentials live only on each {@link DriverRow} in the delivery store (localStorage — see
 * `delivery-demo-storage.ts`). There is no separate "users" table.
 *
 * Used by the login page to sync the form when company / store changes — never while the user
 * is typing character-by-character (do not depend on `username` in the effect deps).
 */
export function computeDriverLoginDefaults(previousUsername: string, drivers: DriverRow[]): {
  username: string;
  password: string;
} {
  if (!drivers.length) {
    return { username: "", password: "" };
  }

  const active = drivers.filter((d) => d.isActive);
  const pool = active.length ? active : drivers;

  const typed = previousUsername.trim().toLowerCase();
  if (!typed) {
    return { username: pool[0].username, password: pool[0].password };
  }

  const match = pool.find((d) => d.username.toLowerCase() === typed);
  if (match) {
    return { username: match.username, password: match.password };
  }

  return { username: "", password: "" };
}
