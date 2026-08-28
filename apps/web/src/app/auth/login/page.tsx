"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const redirectedFrom = searchParams.get("redirectedFrom");
    router.replace(redirectedFrom ?? "/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full">
        <p className="text-sm uppercase tracking-widest text-neutral-400">Recommendly</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in</h1>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              id="email" type="email" required value={email} autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Password</label>
            <input
              id="password" type="password" required value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {loading ? "Signing inâ€¦" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-sm text-neutral-600">
          No account?{" "}
          <Link href="/auth/signup" className="font-medium underline underline-offset-4 hover:text-neutral-900">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
