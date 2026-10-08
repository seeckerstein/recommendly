import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildNotificationPayload } from "../_shared/push-payload.ts";
import { sendPushNotification } from "../_shared/webpush.ts";

const serviceClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:no-reply@youdlike.me";

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface WebhookPayload {
  notification_id: string;
  user_id: string;
  type: string;
  actor_display_name?: string | null;
  actor_user_id?: string | null;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("PUSH_DISPATCHER_SECRET");
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("VAPID keys are not configured; skipping push dispatch");
    return json({ skipped: "vapid_not_configured" }, 200);
  }

  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const notificationId = payload.notification_id;
  const notificationType = payload.type;
  const userId = payload.user_id;
  const actorUserId = payload.actor_user_id;

  if (!notificationId || !notificationType || !userId) {
    return json({ error: "Missing notification fields" }, 400);
  }
  if (
    notificationType !== "subscription_request" &&
    notificationType !== "subscription_approved" &&
    notificationType !== "subscription_rejected" &&
    notificationType !== "access_revoked"
  ) {
    return json({ skipped: "unsupported_notification_type" }, 200);
  }

  const [subsRes, unreadRes] = await Promise.all([
    serviceClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId),
    serviceClient
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);

  if (subsRes.error) {
    console.error("subscription lookup failed:", subsRes.error.message);
    return json({ error: "Subscription lookup failed" }, 500);
  }

  const unreadCount = unreadRes.count ?? 0;
  const subscriptions = (subsRes.data ?? []) as PushSubscriptionRow[];

  if (subscriptions.length === 0) {
    return json({ sent: 0, skipped: "no_subscriptions" }, 200);
  }

  const payloadForClients = buildNotificationPayload({
    type: notificationType,
    actorName: payload.actor_display_name ?? null,
  });

  const invalidIds: string[] = [];
  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payloadForClients,
        { publicKey: vapidPublicKey, privateKey: vapidPrivateKey, subject: vapidSubject },
      );
      if (result.ok) sent++;
      else failed++;
      if (result.expired) invalidIds.push(sub.id);
    } catch (error) {
      failed++;
      console.error(
        `push send failed for subscription ${sub.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (invalidIds.length > 0) {
    const { error: cleanupError } = await serviceClient
      .from("push_subscriptions")
      .delete()
      .in("id", invalidIds);
    if (cleanupError) {
      console.error("invalid subscription cleanup failed:", cleanupError.message);
    }
  }

  return json({ sent, failed, cleaned_up: invalidIds.length, unread_count: unreadCount }, 200);
});
