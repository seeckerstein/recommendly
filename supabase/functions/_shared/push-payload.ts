// Pure notification-payload mapping shared by the push dispatcher and
// unit/domain tests. Kept free of platform imports (no Deno/web-push) so it
// can be consumed from packages/domain tests without a runtime shim.

export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
}

export function buildNotificationPayload(input: {
  type: string;
  actorName: string | null;
}): PushPayload {
  const actor = input.actorName ?? "Someone";
  const messages: Record<string, { title: string; body: string }> = {
    subscription_request: { title: "Connection request", body: `${actor} asked to connect with you.` },
    subscription_approved: { title: "Connection approved", body: `${actor} approved your connection request.` },
    subscription_rejected: { title: "Connection declined", body: `${actor} declined your connection request.` },
    access_revoked: { title: "Access removed", body: `${actor} removed your access.` },
  };
  const message = messages[input.type] ?? { title: "Activity", body: "You have a new notification." };
  return {
    title: `YOU'D LIKE — ${message.title}`,
    body: message.body,
    tag: input.type,
    url: "/notifications",
  };
}
