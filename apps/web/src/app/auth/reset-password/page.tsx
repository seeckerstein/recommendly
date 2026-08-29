"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full">
        <p className="text-sm uppercase tracking-widest text-neutral-400">Recommendly</p>
        {success ? (
          <div className="mt-2">
            <h1 className="text-3xl font-semibold tracking-tight">Password updated</h1>
            <p className="mt-4 text-sm text-emerald-700">Your password has been updated successfully.</p>
            <a href="/auth/login" className="mt-6 inline-block rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
              Go to sign in
            </a>
          </div>
        ) : (
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Set new password</h1>
            <form onSubmit={function(e) { e.preventDefault(); setLoading(true); setError(null);
              const supabase = createSupabaseBrowserClient();
              supabase.auth.updateUser({ password }).then(function(_ref) {
                var error = _ref.error;
                if (error) { setError(error.message); setLoading(false); return; }
                setSuccess(true); setLoading(false);
              });
            }} className="mt-8 space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium">New password</label>
                <input
                  id="password" type="password" required value={password} autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium">Confirm new password</label>
                <input
                  id="confirm" type="password" required value={confirm} autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
              {password !== confirm && password && confirm && (
                <p className="text-sm text-red-600">Passwords do not match.</p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit" disabled={loading || password !== confirm}
                className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
              >
                {loading ? "Updating…" : "Set new password"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
