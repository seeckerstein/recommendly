import { describe, expect, it, vi } from "vitest";
import { authenticateMcpRequest } from "../../../supabase/functions/mcp/mcp-auth";

const corsHeaders = { "content-type": "application/json", "access-control-allow-origin": "*" };
const metadataUrl = "https://test.supabase.co/functions/v1/mcp/.well-known/oauth-protected-resource";
const challenge = `Bearer resource_metadata="${metadataUrl}"`;

describe("MCP HTTP bearer authentication", () => {
  it("accepts a cryptographically verified OAuth access token", async () => {
    const verifyClaims = vi.fn(async () => ({
      data: { claims: { sub: "user-123", client_id: "chatgpt-app" } },
      error: null,
    }));

    const result = await authenticateMcpRequest("Bearer oauth-token", verifyClaims, corsHeaders, metadataUrl);

    expect(verifyClaims).toHaveBeenCalledWith("oauth-token");
    expect(result).toEqual({ accessToken: "oauth-token" });
  });

  it.each([
    ["expired", { data: null, error: new Error("JWT expired") }],
    ["invalid", { data: null, error: new Error("Invalid JWT") }],
  ])("returns an RFC 9728 HTTP 401 challenge for an %s token", async (_label, verification) => {
    const result = await authenticateMcpRequest(
      "Bearer rejected-token",
      vi.fn(async () => verification),
      corsHeaders,
      metadataUrl,
    );

    expect("response" in result).toBe(true);
    if (!("response" in result)) throw new Error("Expected authentication rejection");
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("WWW-Authenticate")).toBe(challenge);
  });

  it("returns HTTP 403 for a valid token that is not issued through OAuth", async () => {
    const result = await authenticateMcpRequest(
      "Bearer web-session-token",
      vi.fn(async () => ({ data: { claims: { sub: "user-123", role: "authenticated" } }, error: null })),
      corsHeaders,
      metadataUrl,
    );

    expect("response" in result).toBe(true);
    if (!("response" in result)) throw new Error("Expected authorization rejection");
    expect(result.response.status).toBe(403);
    expect(result.response.headers.get("WWW-Authenticate")).toBeNull();
  });

  it("returns HTTP 401 with metadata challenge for a missing bearer token", async () => {
    const verifyClaims = vi.fn();
    const result = await authenticateMcpRequest(null, verifyClaims, corsHeaders, metadataUrl);

    expect(verifyClaims).not.toHaveBeenCalled();
    expect("response" in result).toBe(true);
    if (!("response" in result)) throw new Error("Expected authentication rejection");
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("WWW-Authenticate")).toBe(challenge);
  });
});
