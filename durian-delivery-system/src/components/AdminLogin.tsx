"use client";

import { useState } from "react";

type AdminLoginProps = {
  onSuccess: () => void;
};

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Login failed.");
      }

      onSuccess();
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Login failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-sm space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h1 className="text-xl font-bold text-stone-900">Admin Login</h1>
        <p className="mt-1 text-sm text-stone-600">
          Masuk untuk urus pesanan Musang King.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-stone-700">Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
        />
      </label>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
