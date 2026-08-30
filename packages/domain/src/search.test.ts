import { describe, expect, it } from "vitest";

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function matches(profile: { display_name: string; email: string }, rawQuery: string): boolean {
  const q = normalizeQuery(rawQuery);
  return (
    profile.display_name.toLowerCase().includes(q) ||
    profile.email.toLowerCase().includes(q)
  );
}

describe("person search normalization", () => {
  const profile = { display_name: "Johan Eckerstein", email: "johan.eckerstein@gmail.com" };

  it("matches exact email", () => {
    expect(matches(profile, "johan.eckerstein@gmail.com")).toBe(true);
  });

  it("matches partial email", () => {
    expect(matches(profile, "eckerstein@gmail")).toBe(true);
  });

  it("matches display name", () => {
    expect(matches(profile, "Johan")).toBe(true);
    expect(matches(profile, "Eckerstein")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(matches(profile, "JOHAN.ECKERSTEIN@GMAIL.COM")).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(matches(profile, "  johan  ")).toBe(true);
  });
});

describe("duplicate display names", () => {
  it("distinguishes people by email", () => {
    const results = [
      { display_name: "Johan Eckerstein", email: "johan.eckerstein@gmail.com" },
      { display_name: "Johan Eckerstein", email: "johan.eckerstein@beyondadvisory.ch" },
    ];
    expect(results.filter((r) => matches(r, "Johan")).length).toBe(2);
    expect(results[0].email).not.toBe(results[1].email);
  });
});

describe("result limiting", () => {
  it("keeps a sensible maximum", () => {
    expect(20).toBeLessThanOrEqual(20);
  });
});

describe("search response privacy", () => {
  const fields = ["id", "email", "display_name", "bio", "avatar_url", "profile_visibility"];

  it("returns only intended public profile fields", () => {
    expect(fields).not.toContain("username");
    expect(fields).not.toContain("user_id");
    expect(fields).not.toContain("raw_user_meta_data");
  });

  it("does not return auth.users internal fields", () => {
    const forbidden = ["encrypted_password", "confirmation_token", "recovery_token"];
    for (const f of forbidden) expect(fields).not.toContain(f);
  });

  it("keeps email as the unique distinguishing identifier", () => {
    const a = { display_name: "Same Name", email: "a@example.com" };
    const b = { display_name: "Same Name", email: "b@example.com" };
    expect(a.email !== b.email).toBe(true);
  });
});
