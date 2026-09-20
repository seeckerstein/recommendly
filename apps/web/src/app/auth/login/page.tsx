"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Input, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-6 py-12">
      <div className="w-full">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Recommendly
        </p>
        <h1 className="display mt-3 text-[2.25rem] font-normal leading-[1.1] text-ink">
          Welcome back.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Sign in to see what the people you trust are recommending.
        </p>

        <form onSubmit={handleSubmit} className="mt-9 space-y-5">
          <Field htmlFor="email" label="Email">
            <Input
              id="email"
              type="email"
              required
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field htmlFor="password" label="Password">
            <Input
              id="password"
              type="password"
              required
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" variant="accent" size="lg" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

      <div className="mt-6 space-y-2">
        {["google"].map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={async () => {
              setError(null);
              setLoading(true);
              const supabase = createSupabaseBrowserClient();
              const { error } = await supabase.auth.signInWithOAuth({
                provider: provider as "google" | "apple",
                options: {
                  redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(new URLSearchParams(window.location.search).get("redirectedFrom") ?? "/")}`,
                },
              });
              if (error) {
                setError(error.message);
                setLoading(false);
              }
            }}
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line-strong bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-sunk disabled:opacity-50"
          >
            Continue with {provider === "google" ? "Google" : "Apple"}
          </button>
        ))}
      </div>

        <p className="mt-7 text-sm text-ink-soft">
          No account?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-accent underline underline-offset-4"
          >
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
