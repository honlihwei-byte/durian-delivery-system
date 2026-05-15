"use client";

import { useRouter } from "next/navigation";
import { clearCurrentSession } from "@/lib/demo-session";

type Props = {
  redirectTo?: string;
  className?: string;
};

export function SessionLogoutButton({
  redirectTo = "/login",
  className = "rounded-lg border border-drive-line px-3 py-2 text-sm font-medium text-drive-ink hover:bg-drive-bg",
}: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        clearCurrentSession();
        router.push(redirectTo);
        router.refresh();
      }}
      className={className}
    >
      Sign out
    </button>
  );
}
