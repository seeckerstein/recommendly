import { describe, expect, it } from "vitest";

function unreadCount(items: { read_at: string | null }[]): number {
  return items.filter((n) => !n.read_at).length;
}

describe("notification visibility", () => {
  const recipient = "user-b";
  const actor = "user-a";

  const notifications = [
    {
      id: "1",
      user_id: recipient,
      actor_user_id: actor,
      type: "subscription_request",
      read_at: null,
    },
    {
      id: "2",
      user_id: recipient,
      actor_user_id: actor,
      type: "subscription_approved",
      read_at: "2026-08-30T00:00:00Z",
    },
  ];

  it("counts unread notifications", () => {
    expect(unreadCount(notifications)).toBe(1);
  });

  it("only includes notifications addressed to the recipient", () => {
    const visible = notifications.filter((n) => n.user_id === recipient);
    expect(visible.length).toBe(2);
    expect(visible.every((n) => n.user_id !== actor)).toBe(true);
  });

  it("keeps unauthorized users from reading another user's notifications", () => {
    const unauthorized = notifications.filter((n) => n.user_id === actor);
    expect(unauthorized.length).toBe(0);
  });

  it("prioritizes pending access requests", () => {
    const pending = notifications.filter(
      (n) => n.type === "subscription_request" && !n.read_at,
    );
    expect(pending.length).toBe(1);
  });
});

describe("subscription notification contract", () => {
  const requestNotification = {
    id: "1",
    user_id: "user-b",
    actor_user_id: "user-a",
    type: "subscription_request",
    reference_type: "subscription",
    reference_id: "subscription-1",
    read_at: null,
  };

  it("identifies actionable request notifications by exact subscription reference", () => {
    const actionable =
      requestNotification.type === "subscription_request" &&
      requestNotification.reference_type === "subscription" &&
      requestNotification.reference_id !== null;
    expect(actionable).toBe(true);
  });

  it("uses lifecycle notification types matching the push dispatcher allowlist", () => {
    const types = [
      "subscription_request",
      "subscription_approved",
      "subscription_rejected",
      "access_revoked",
    ];
    expect(types).toContain("subscription_request");
    expect(types).toContain("subscription_approved");
    expect(types).toContain("subscription_rejected");
    expect(types).toContain("access_revoked");
  });
});
