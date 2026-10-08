"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { registerPushSubscription, removePushSubscription } from "./api";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const SERVICE_WORKER_PATH = "/service-worker.js";

export interface PushPermissionState {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
}

export function pushPermissionState(): PushPermissionState {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { supported: false, permission: "unsupported" };
  }
  return { supported: true, permission: Notification.permission };
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function enablePushNotifications(): Promise<{ ok: boolean; reason?: string }> {
  const state = pushPermissionState();
  if (!state.supported) return { ok: false, reason: "unsupported" };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "server-not-configured" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: permission };

  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const raw = subscription.toJSON();
  const endpoint = typeof raw.endpoint === "string" ? raw.endpoint : null;
  const p256dh = raw.keys?.p256dh;
  const auth = raw.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    await subscription.unsubscribe().catch(() => {});
    return { ok: false, reason: "invalid-subscription" };
  }

  try {
    await registerPushSubscription({ endpoint, p256dh, auth, user_agent: navigator.userAgent });
    return { ok: true };
  } catch {
    await subscription.unsubscribe().catch(() => {});
    return { ok: false, reason: "registration-failed" };
  }
}

export async function disablePushNotifications(): Promise<void> {
  const subscription = await getExistingSubscription();
  if (subscription) {
    try {
      await removePushSubscription(subscription.endpoint);
    } catch {
      // Best-effort cleanup; the browser unsubscribe still happens below.
    }
    await subscription.unsubscribe().catch(() => {});
  }
  const registration = await navigator.serviceWorker.getRegistration();
  await registration?.unregister().catch(() => {});
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) output[i] = binary.charCodeAt(i);
  return output;
}
