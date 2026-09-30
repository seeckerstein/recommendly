"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteAccountSection() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText === "DELETE" && !submitting;

  async function handleDelete() {
    if (!canDelete) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Your account was not deleted.");
        setSubmitting(false);
        return;
      }
      router.replace("/auth/login");
    } catch {
      setError("Something went wrong. Your account was not deleted.");
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setConfirming(false);
    setConfirmText("");
    setError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") handleCancel();
  }

  return (
    <section className="py-6">
      <h2 className="display text-[1.125rem] leading-snug text-ink">Delete your account</h2>
      <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
        Permanently delete your YOU&#39;D LIKE account, including your profile, recommendations, comments, ratings, and connections. This cannot be undone.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-red-300 bg-red-50 px-5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-4" onKeyDown={handleKeyDown}>
          <p className="text-sm font-medium text-red-800">Delete your account?</p>
          <p className="mt-1 text-[15px] leading-relaxed text-red-700">
            This permanently deletes your YOU&#39;D LIKE account, your profile, all of your recommendations, comments, ratings, and connections. This cannot be undone.
          </p>
          <div className="mt-3">
            <label htmlFor="delete-confirm" className="text-sm font-medium text-red-800">
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1.5 block w-full max-w-xs rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder="Type DELETE"
              autoFocus
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={!canDelete}
              className="inline-flex min-h-11 items-center rounded-full bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Deleting…" : "Delete my account permanently"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-sunk"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}