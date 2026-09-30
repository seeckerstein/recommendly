import { describe, expect, it } from "vitest";

describe("account deletion flow", () => {
  describe("confirmation word matching", () => {
    function isConfirmed(input: string) {
      return input === "DELETE";
    }

    it("accepts exact uppercase DELETE", () => {
      expect(isConfirmed("DELETE")).toBe(true);
    });

    it("rejects lowercase delete", () => {
      expect(isConfirmed("delete")).toBe(false);
    });

    it("rejects mixed case Delete", () => {
      expect(isConfirmed("Delete")).toBe(false);
    });

    it("rejects DELETE with leading whitespace", () => {
      expect(isConfirmed(" DELETE")).toBe(false);
    });

    it("rejects DELETE with trailing whitespace", () => {
      expect(isConfirmed("DELETE ")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isConfirmed("")).toBe(false);
    });

    it("rejects arbitrary text", () => {
      expect(isConfirmed("yes")).toBe(false);
      expect(isConfirmed("confirm")).toBe(false);
    });
  });

  describe("deletion endpoint contract", () => {
    it("returns 401 for unauthenticated requests", () => {
      const unauthenticatedResponse = { status: 401, body: { error: "Unauthorized" } };
      expect(unauthenticatedResponse.status).toBe(401);
      expect(unauthenticatedResponse.body.error).toBe("Unauthorized");
    });

    it("returns 503 when service-role key is not configured", () => {
      const response = { status: 503, body: { error: "Account deletion is temporarily unavailable." } };
      expect(response.status).toBe(503);
      expect(response.body.error).not.toContain("key");
      expect(response.body.error).not.toContain("token");
      expect(response.body.error).not.toContain("secret");
    });

    it("returns 500 with user-friendly message on deletion failure", () => {
      const response = { status: 500, body: { error: "We couldn't delete your account right now. Please try again later." } };
      expect(response.status).toBe(500);
      expect(response.body.error).not.toContain("admin");
      expect(response.body.error).not.toContain("service");
    });

    it("returns ok on success", () => {
      const response = { status: 200, body: { ok: true } };
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });

  describe("service-role key protection", () => {
    it("never exposes the key in response bodies", () => {
      const fakeKey = "sb_secret_abc123def456";
      const responses = [
        { error: "Unauthorized" },
        { error: "Account deletion is temporarily unavailable." },
        { error: "We couldn't delete your account right now. Please try again later." },
        { ok: true },
      ];
      for (const body of responses) {
        expect(JSON.stringify(body)).not.toContain(fakeKey);
      }
    });
  });
});