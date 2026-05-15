"use client";

import { clearCurrentSession } from "@/lib/demo-session";
import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        clearCurrentSession();
        router.push("/login?role=admin");
        router.refresh();
      }}
      className="rounded-lg border border-drive-line px-3 py-2 text-sm font-medium text-drive-ink hover:bg-drive-bg"
    >
      Sign out
    </button>
  );
}
