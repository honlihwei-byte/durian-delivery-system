"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearAdminPinSession,
  isAdminPinSessionValid,
  saveAdminPinSession,
  verifyAdminPin,
} from "@/lib/admin-pin";

type Props = {
  children: React.ReactNode;
};

export function AdminPinGate({ children }: Props) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    setUnlocked(isAdminPinSessionValid());
    setReady(true);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (pin.length !== 6) {
        setWrong(true);
        return;
      }
      if (!verifyAdminPin(pin)) {
        setWrong(true);
        setPin("");
        return;
      }
      saveAdminPinSession();
      setWrong(false);
      setPin("");
      setUnlocked(true);
    },
    [pin],
  );

  const handleLock = useCallback(() => {
    clearAdminPinSession();
    setUnlocked(false);
    setPin("");
    setWrong(false);
  }, []);

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center px-4">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 px-4 py-12">
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Admin access</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter the 6-digit PIN to view attendance and admin pages.
          </p>
        </header>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            PIN
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setWrong(false);
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
              }}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-4 text-center font-mono text-2xl tracking-[0.4em] dark:border-zinc-600 dark:bg-zinc-900"
              placeholder="••••••"
              autoFocus
            />
          </label>
          {wrong ? (
            <p className="text-center text-sm font-medium text-red-600 dark:text-red-400">Wrong PIN</p>
          ) : null}
          <button
            type="submit"
            disabled={pin.length !== 6}
            className="rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={handleLock}
          className="rounded-lg border border-zinc-300 bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm backdrop-blur dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-100"
        >
          Lock admin
        </button>
      </div>
      {children}
    </div>
  );
}
