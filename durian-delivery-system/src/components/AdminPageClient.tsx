"use client";

import { useState } from "react";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminLogin } from "@/components/AdminLogin";

type AdminPageClientProps = {
  initialAuthenticated: boolean;
};

export function AdminPageClient({
  initialAuthenticated,
}: AdminPageClientProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);

  return (
    <main className="min-h-screen bg-stone-100">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        {isAuthenticated ? (
          <AdminDashboard onUnauthorized={() => setIsAuthenticated(false)} />
        ) : (
          <div className="flex min-h-[70vh] items-center justify-center">
            <AdminLogin onSuccess={() => setIsAuthenticated(true)} />
          </div>
        )}
      </div>
    </main>
  );
}
