"use client";

import { useEffect, useState } from "react";

type Toast = {
  id: string;
  message: string;
};

export function useAdminToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function addToast(message: string) {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message }]);
  }

  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, 5000),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [toasts]);

  return { toasts, addToast };
}

export function AdminToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
