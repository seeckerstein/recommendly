import { describe, expect, it } from "vitest";

import { buildNotificationPayload } from "../../../supabase/functions/_shared/push-payload";

describe("push notification payload", () => {
  it.each([
    ["subscription_request", "Connection request", "asked to connect with you"],
    [
      "subscription_approved",
      "Connection approved",
      "approved your connection request",
    ],
    [
      "subscription_rejected",
      "Connection declined",
      "declined your connection request",
    ],
    ["access_revoked", "Access removed", "removed your access"],
  ])(
    "maps %s to the correct title and body",
    (type, expectedTitle, expectedBody) => {
      const payload = buildNotificationPayload({ type, actorName: "Ada" });
      expect(payload.title).toBe(`YOU'D LIKE — ${expectedTitle}`);
      expect(payload.body).toBe(`Ada ${expectedBody}.`);
      expect(payload.tag).toBe(type);
      expect(payload.url).toBe("/notifications");
    },
  );

  it("falls back to a generic message for unknown types", () => {
    const payload = buildNotificationPayload({
      type: "future_type",
      actorName: null,
    });
    expect(payload.title).toBe("YOU'D LIKE — Activity");
    expect(payload.body).toBe("You have a new notification.");
  });

  it("uses a neutral actor name when none is provided", () => {
    const payload = buildNotificationPayload({
      type: "subscription_request",
      actorName: null,
    });
    expect(payload.body).toBe("Someone asked to connect with you.");
  });
});
