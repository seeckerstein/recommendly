"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<"idle" | "installing" | "done" | "dismissed">("idle");

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!deferred) return;
    setStatus("installing");
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setStatus(outcome === "accepted" ? "done" : "dismissed");
    setDeferred(null);
  }

  if (status === "done") {
    return <p className="text-sm text-positive">Installed. Check your home screen.</p>;
  }

  if (deferred) {
    return (
      <button
        type="button"
        onClick={install}
        disabled={status === "installing"}
        className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-white shadow-quiet transition-colors hover:bg-accent-ink disabled:opacity-50"
      >
        {status === "installing" ? "Installing…" : "Install Recommendly"}
      </button>
    );
  }

  return (
    <p className="text-sm leading-relaxed text-ink-soft">
      If no install button appears, open Chrome&apos;s menu (⋮) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
    </p>
  );
}
