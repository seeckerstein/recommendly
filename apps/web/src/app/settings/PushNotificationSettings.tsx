"use client";

import { useEffect, useState } from "react";
import { disablePushNotifications, enablePushNotifications, getExistingSubscription, pushPermissionState } from "@/lib/push";

export function PushNotificationSettings() {
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const state = pushPermissionState();

  useEffect(() => {
    getExistingSubscription().then((s) => setSubscribed(Boolean(s))).catch(() => setSubscribed(false));
  }, []);

  async function handleEnable() {
    setStatus("busy");
    setMessage(null);
    const result = await enablePushNotifications();
    setStatus("done");
    setSubscribed(result.ok);
    setMessage(
      result.ok
        ? "Notifications enabled for this browser."
        : result.reason === "denied"
          ? "Permission was denied. You can change it in browser settings."
          : "Could not enable notifications.",
    );
  }

  async function handleDisable() {
    setStatus("busy");
    await disablePushNotifications();
    setStatus("done");
    setSubscribed(false);
    setMessage("Notifications disabled for this browser.");
  }


  if (!state.supported) return null;

  return (
    <div className="mt-5 rounded-xl border border-line bg-surface px-4 py-4">
      <h3 className="text-sm font-medium text-ink">Browser notifications</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        Receive Activity notifications even when YOU&apos;D LIKE is closed. Email settings are separate.
      </p>
      <div className="mt-3 flex gap-2">
        {!subscribed ? (
          <button type="button" onClick={handleEnable} disabled={status === "busy"} className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Enable notifications
          </button>
        ) : (
          <button type="button" onClick={handleDisable} disabled={status === "busy"} className="rounded-full border border-line px-4 py-2 text-sm text-ink disabled:opacity-50">
            Disable notifications
          </button>
        )}
      </div>
      {message && <p className="mt-2 text-sm text-ink-soft">{message}</p>}
    </div>
  );
}
