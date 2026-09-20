"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/ui/AuthShell";
import { Button, ButtonLink } from "@/components/ui/Button";

const AUTH_ERROR_PATTERNS = ["authorization not found", "unauthorized", "forbidden", "invalid token", "session missing", "no_authorization", "expired"];

function isAuthRelatedError(message: string): boolean {
  const lower = message.toLowerCase();
  return AUTH_ERROR_PATTERNS.some((p) => lower.includes(p));
}

function ConsentForm() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ready" | "approved" | "denied" | "error" | "redirecting">("loading");
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [authScopes, setAuthScopes] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function init() {
      const authId = searchParams.get("authorization_id");
      if (!authId) {
        setError("Missing authorization request. Please restart the connection from your AI assistant.");
        setStatus("error");
        return;
      }

      // Establish/verify session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Try refresh before giving up
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        if (!refreshed?.user) {
          const loginUrl = new URL("/auth/login", window.location.origin);
          loginUrl.searchParams.set("redirectedFrom", `/oauth/consent?authorization_id=${authId}`);
          window.location.href = loginUrl.toString();
          return;
        }
        setUserName(refreshed.user.email ?? "your account");
      } else {
        setUserName(session.user.email ?? "your account");
      }

      // Call getAuthorizationDetails â€” this binds the pending auth to the user
      // and returns either authorization details or a redirect (if already consented)
      const { data, error: authError } = await supabase.auth.oauth.getAuthorizationDetails(authId);
      if (authError) {
        setError(authError.message);
        setStatus("error");
        return;
      }

      // Check if the response is a redirect (user already consented for this client+scopes)
      if (data && "redirect_url" in data && data.redirect_url) {
        // Already consented â€” immediately redirect
        setStatus("redirecting");
        window.location.href = (data as { redirect_url: string }).redirect_url;
        return;
      }

      // Response is authorization details â€” show consent UI
      if (data && "client" in data) {
        const details = data as { client?: { name?: string }, scope?: string };
        setClientName(details.client?.name ?? "your AI assistant");
        setAuthScopes(details.scope ? details.scope.split(" ").filter(Boolean) : []);
      }
      setStatus("ready");
    }
    init();
  }, []);

  const authorizationId = searchParams.get("authorization_id");

  async function handleAction(approve: boolean) {
    if (!authorizationId) {
      setError("Missing authorization request.");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      // Ensure fresh token
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !session?.access_token) {
        throw new Error("Your session has expired. Please sign in again and retry.");
      }

      if (approve) {
        let { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true });
        if (error && isAuthRelatedError(error.message)) {
          const { data: { session: retrySession } } = await supabase.auth.refreshSession();
          if (!retrySession?.access_token) throw error;
          const retry = await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true });
          error = retry.error;
          data = retry.data;
        }
        if (error) throw error;
        if (data?.redirect_url) {
          setStatus("redirecting");
          window.location.href = data.redirect_url;
          return;
        }
        setStatus("approved");
      } else {
        let { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
        if (error && isAuthRelatedError(error.message)) {
          const { data: { session: retrySession } } = await supabase.auth.refreshSession();
          if (!retrySession?.access_token) throw error;
          const retry = await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
          error = retry.error;
          data = retry.data;
        }
        if (error) throw error;
        if (data?.redirect_url) {
          setStatus("redirecting");
          window.location.href = data.redirect_url;
          return;
        }
        setStatus("denied");
      }
    } catch (e) {
      setError((e as Error).message);
      setProcessing(false);
    }
  }

  if (status === "loading" || status === "redirecting") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-6">
        <p className="text-sm text-ink-faint">
          {status === "loading" ? "Checking your session…" : "Redirecting…"}
        </p>
      </main>
    );
  }

  if (status === "approved") {
    return (
      <AuthShell
        title="Connected."
        lede="Your assistant can now work with your shelf. You can close this window."
      >
        <ButtonLink href="/" variant="secondary" size="lg">
          Back to Recommendly
        </ButtonLink>
      </AuthShell>
    );
  }

  if (status === "denied") {
    return (
      <AuthShell
        title="Access denied."
        lede="Your assistant will not have access to your recommendations. You can close this window."
      >
        <ButtonLink href="/" variant="secondary" size="lg">
          Back to Recommendly
        </ButtonLink>
      </AuthShell>
    );
  }

  if (status === "error") {
    return (
      <AuthShell title="Authentication required." lede={error}>
        <ButtonLink href="/auth/login" variant="accent" size="lg">
          Sign in
        </ButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Connect your assistant."
      lede={
        clientName ? (
          <>
            <span className="font-medium text-ink">{clientName}</span> is requesting access to your
            Recommendly account.
          </>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {userName && (
          <p className="rounded-xl bg-surface-sunk px-4 py-3 text-sm text-ink-soft">
            Signed in as <span className="font-medium text-ink">{userName}</span>
          </p>
        )}

        {authScopes.length > 0 && (
          <div>
            <p className="text-sm font-medium text-ink">Requested permissions</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {authScopes.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-surface-sunk px-2.5 py-1 text-xs font-medium text-ink-soft"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 rounded-2xl border border-line bg-surface p-5 text-sm text-ink-soft">
          <div>
            <p className="font-medium text-ink">It will be able to</p>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>Read your recommendations and those from people you have connected with</li>
              <li>Create new recommendations on your behalf</li>
              <li>Edit recommendations you have already made</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-ink">It will not be able to</p>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>See recommendations from users you are not connected to</li>
              <li>Access your password or other account settings</li>
            </ul>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            variant="accent"
            size="lg"
            disabled={processing}
            onClick={() => handleAction(true)}
            className="flex-1"
          >
            {processing ? "Connecting…" : "Allow access"}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            disabled={processing}
            onClick={() => handleAction(false)}
            className="flex-1"
          >
            Deny
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={null}>
      <ConsentForm />
    </Suspense>
  );
}
