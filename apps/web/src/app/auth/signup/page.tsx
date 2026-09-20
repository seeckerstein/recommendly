"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/ui/AuthShell";
import { Input, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace("/");
      router.refresh();
      return;
    }

    setNotice("Check your email to confirm your account before signing in.");
    setLoading(false);
  }

  return (
    <AuthShell
      title="Start your shelf."
      lede="Keep the things worth recommending, and share them only with the people you choose."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-accent underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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

        <Field htmlFor="password" label="Password" hint="At least 8 characters.">
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-positive">
            {notice}
          </p>
        )}

        <Button type="submit" variant="accent" size="lg" disabled={loading} className="w-full">
          {loading ? "Creating account…" : "Create account"}
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
                  redirectTo: `${window.location.origin}/auth/callback?next=/`,
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
      </div>    </AuthShell>
  );
}
