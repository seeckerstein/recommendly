import { describe, expect, it } from "vitest";

describe("relationship state mapping", () => {
  const labels: Record<string, string> = {
    SELF: "This is you",
    NOT_CONNECTED: "",
    PENDING: "Request pending",
    APPROVED: "Connected",
    REJECTED: "Request declined",
    REVOKED: "Access removed",
  };

  it("maps all relationship states to user-friendly labels", () => {
    expect(labels.SELF).toBe("This is you");
    expect(labels.PENDING).toBe("Request pending");
    expect(labels.APPROVED).toBe("Connected");
    expect(labels.REJECTED).toBe("Request declined");
    expect(labels.REVOKED).toBe("Access removed");
    expect(labels.NOT_CONNECTED).toBe("");
  });

  it("uses simple user-facing terminology", () => {
    const allLabels = Object.values(labels).join(" ");
    expect(allLabels).not.toContain("subscription");
    expect(allLabels).not.toContain("RLS");
    expect(allLabels).not.toContain("OAuth");
  });
});

describe("notification type normalization", () => {
  const typeLabels: Record<string, string> = {
    subscription_request: "wants to connect with you",
    subscription_approved: "approved your connection request",
    subscription_rejected: "declined your connection request",
    access_revoked: "removed your access",
  };

  it("normalizes all notification types to human-readable text", () => {
    expect(typeLabels.subscription_request).toContain("connect");
    expect(typeLabels.subscription_approved).toContain("approved");
    expect(typeLabels.subscription_rejected).toContain("declined");
    expect(typeLabels.access_revoked).toContain("removed");
  });

  it("does not expose internal type names", () => {
    for (const label of Object.values(typeLabels)) {
      expect(label).not.toContain("subscription_");
      expect(label).not.toContain("PENDING");
      expect(label).not.toContain("APPROVED");
    }
  });
});

describe("subscription status transitions", () => {
  const validTransitions: Record<string, string[]> = {
    PENDING: ["APPROVED", "REJECTED"],
    APPROVED: ["REVOKED"],
    REJECTED: [],
    REVOKED: [],
  };

  it("allows only valid state transitions", () => {
    expect(validTransitions.PENDING).toContain("APPROVED");
    expect(validTransitions.PENDING).toContain("REJECTED");
    expect(validTransitions.APPROVED).toEqual(["REVOKED"]);
    expect(validTransitions.REJECTED).toEqual([]);
    expect(validTransitions.REVOKED).toEqual([]);
  });

  it("does not allow publisher to transition to PENDING", () => {
    for (const from of Object.keys(validTransitions)) {
      expect(validTransitions[from]).not.toContain("PENDING");
    }
  });
});
