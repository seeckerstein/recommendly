"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

      // Call getAuthorizationDetails — this binds the pending auth to the user
      // and returns either authorization details or a redirect (if already consented)
      const { data, error: authError } = await supabase.auth.oauth.getAuthorizationDetails(authId);
      if (authError) {
        setError(authError.message);
        setStatus("error");
        return;
      }

      // Check if the response is a redirect (user already consented for this client+scopes)
      if (data && "redirect_url" in data && data.redirect_url) {
        // Already consented — immediately redirect
        setStatus("redirecting");
        window.location.href = (data as { redirect_url: string }).redirect_url;
        return;
      }

      // Response is authorization details — show consent UI
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

  if (status === "loading") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <p className="text-neutral-500">Checking your session…</p>
      </main>
    );
  }

  if (status === "redirecting") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <p className="text-neutral-500">Redirecting…</p>
      </main>
    );
  }

  if (status === "approved") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Connected</h1>
          <p className="mt-2 text-sm text-neutral-600">Your AI assistant is now connected. You can close this window.</p>
        </div>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Access denied</h1>
          <p className="mt-2 text-sm text-neutral-600">Your AI assistant will not have access to your recommendations. You can close this window.</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Authentication required</h1>
          <p className="mt-2 text-sm text-neutral-600">{error}</p>
          <a href="/auth/login" className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
            Sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full">
        <p className="text-sm uppercase tracking-widest text-neutral-400">Recommendly</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Connect your AI</h1>
        {clientName && (
          <p className="mt-3 text-sm text-neutral-600">
            <span className="font-medium">{clientName}</span> is requesting access to your Recommendly account.
          </p>
        )}
        {userName && (
          <p className="mt-4 rounded-md bg-neutral-50 px-4 py-3 text-sm">
            Signed in as <span className="font-medium">{userName}</span>
          </p>
        )}
        {authScopes.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-neutral-900">Requested permissions:</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {authScopes.map((s) => (
                <span key={s} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">{s}</span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 space-y-3 text-sm text-neutral-600">
          <p className="font-medium text-neutral-900">Your AI assistant will be able to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Read your recommendations</li>
            <li>Create new recommendations on your behalf</li>
            <li>Edit recommendations you have already made</li>
          </ul>
          <p className="font-medium text-neutral-900">Your AI assistant will not be able to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>See other users&rsquo; recommendations</li>
            <li>Access your password or other account settings</li>
          </ul>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            disabled={processing}
            onClick={() => handleAction(true)}
            className="flex-1 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {processing ? "Connecting…" : "Allow access"}
          </button>
          <button
            type="button"
            disabled={processing}
            onClick={() => handleAction(false)}
            className="flex-1 rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={null}>
      <ConsentForm />
    </Suspense>
  );
}
