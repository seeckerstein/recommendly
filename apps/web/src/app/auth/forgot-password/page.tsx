"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/reset-password",
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full">
          <p className="text-sm uppercase tracking-widest text-neutral-400">Recommendly</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-4 text-sm text-emerald-700">
            If an account exists for that email, we&apos;ve sent a password reset link.
          </p>
          <Link href="/auth/login" className="mt-6 inline-block text-sm font-medium underline">
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full">
        <p className="text-sm uppercase tracking-widest text-neutral-400">Recommendly</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reset password</h1>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              id="email" type="email" required value={email} autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-sm text-neutral-600">
            Remember it?{" "}
            <Link href="/auth/login" className="font-medium underline underline-offset-4 hover:text-neutral-900">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
