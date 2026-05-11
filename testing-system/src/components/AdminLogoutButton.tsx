"use client";

import { useRouter } from "next/navigation";
import { adminLogout } from "@/actions/admin";

export function AdminLogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await adminLogout();
        router.push("/admin/login");
        router.refresh();
      }}
      className="rounded-lg border border-drive-line px-3 py-2 text-sm font-medium text-drive-ink hover:bg-drive-bg"
    >
      Sign out
    </button>
  );
}
