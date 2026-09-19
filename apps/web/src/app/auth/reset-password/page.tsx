"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/ui/AuthShell";
import { Input, Field } from "@/components/ui/Input";
import { Button, ButtonLink } from "@/components/ui/Button";

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

  if (success) {
    return (
      <AuthShell title="Password updated." lede="You can sign in with your new password now.">
        <ButtonLink href="/auth/login" variant="accent" size="lg">
          Go to sign in
        </ButtonLink>
      </AuthShell>
    );
  }

  const mismatch = Boolean(password && confirm && password !== confirm);

  return (
    <AuthShell title="Set a new password.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field htmlFor="password" label="New password">
          <Input
            id="password"
            type="password"
            required
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field htmlFor="confirm" label="Confirm new password">
          <Input
            id="confirm"
            type="password"
            required
            value={confirm}
            autoComplete="new-password"
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        {mismatch && <p className="text-sm text-danger">Passwords do not match.</p>}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={loading || mismatch || !password}
          className="w-full"
        >
          {loading ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}
