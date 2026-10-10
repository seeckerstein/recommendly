// Web Push delivery helper for the push dispatcher.
// Uses webpush-webcrypto, a Web Crypto based implementation of RFC 8291
// (aes128gcm encryption) and RFC 8292 (VAPID), compatible with Deno.

import {
  ApplicationServerKeys,
  generatePushHTTPRequest,
  setWebCrypto,
} from "https://esm.sh/webpush-webcrypto@1.0.5";
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

setWebCrypto(crypto);

// Import once at module scope; ES modules are cached after first load.
let applicationServerKeys: ApplicationServerKeys | null = null;

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getApplicationServerKeys(
  vapid: VapidOptions,
): Promise<ApplicationServerKeys> {
  if (applicationServerKeys) return applicationServerKeys;
  const publicKeyBytes = base64UrlToBytes(vapid.publicKey);
  if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
    throw new Error(
      "Unexpected VAPID public key format; expected uncompressed P-256 point",
    );
  }

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: bytesToBase64Url(publicKeyBytes.slice(1, 33)),
    y: bytesToBase64Url(publicKeyBytes.slice(33, 65)),
    d: vapid.privateKey,
    ext: true,
    key_ops: ["sign"],
  };

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    [],
  );
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"],
  );

  applicationServerKeys = new ApplicationServerKeys(publicKey, privateKey);
  return applicationServerKeys;
}

export async function sendPushNotification(
  subscription: PushSubscriptionLike,
  payload: PushPayload,
  vapid: VapidOptions,
): Promise<{ ok: boolean; expired: boolean }> {
  const keys = await getApplicationServerKeys(vapid);

  const request = await generatePushHTTPRequest({
    payload: JSON.stringify(payload),
    ttl: PUSH_SERVICE_TTL_SECONDS,
    adminContact: vapid.subject,
    target: {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    applicationServerKeys: keys,
  });

  const response = await fetch(request.endpoint, {
    method: "POST",
    headers: request.headers,
    body: request.body,
  });

  if (response.status === 201 || response.status === 200)
    return { ok: true, expired: false };
  if (response.status === 404 || response.status === 410)
    return { ok: false, expired: true };
  console.error(
    "push delivery failed:",
    response.status,
    await response.text().catch(() => ""),
  );
  return { ok: false, expired: false };
}
