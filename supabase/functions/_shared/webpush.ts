// Web Push delivery helper for the push dispatcher.
// Uses webpush-webcrypto, a Web Crypto based implementation of RFC 8291
// (aes128gcm encryption) and RFC 8292 (VAPID), compatible with Deno.

import { sendNotification } from "https://esm.sh/webpush-webcrypto@2.0.2";
import { buildNotificationPayload, type PushPayload } from "./push-payload.ts";

export { buildNotificationPayload };
export type { PushPayload };

export interface PushSubscriptionLike {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface VapidOptions {
  publicKey: string;
  privateKey: string;
  subject: string;
}

const PUSH_SERVICE_TTL_SECONDS = 60 * 60 * 24 * 14;

export async function sendPushNotification(
  subscription: PushSubscriptionLike,
  payload: PushPayload,
  vapid: VapidOptions,
): Promise<{ ok: boolean; expired: boolean }> {
  const subscriptionJson = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  };

  const response = await sendNotification(
    subscriptionJson,
    JSON.stringify(payload),
    {
      subject: vapid.subject,
      privateKey: vapid.privateKey,
      publicKey: vapid.publicKey,
      ttl: PUSH_SERVICE_TTL_SECONDS,
    },
  );

  if (response.status === 201 || response.status === 200) return { ok: true, expired: false };
  if (response.status === 404 || response.status === 410) return { ok: false, expired: true };
  console.error("push delivery failed:", response.status, await response.text().catch(() => ""));
  return { ok: false, expired: false };
}
