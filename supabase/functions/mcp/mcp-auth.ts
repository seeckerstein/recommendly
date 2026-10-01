export type McpClaimsVerifier = (token: string) => Promise<unknown>;

type McpClaimsVerification = {
  data?: { claims?: Record<string, unknown> | null } | null;
  error?: unknown | null;
};

export type McpAuthenticationResult =
  | { accessToken: string }
  | { response: Response };

export async function authenticateMcpRequest(
  authorization: string | null,
  verifyClaims: McpClaimsVerifier,
  corsHeaders: Record<string, string>,
  protectedResourceMetadataUrl: string,
): Promise<McpAuthenticationResult> {
  const match = authorization?.trim().match(/^Bearer\s+(.+)$/i);
  const accessToken = match?.[1]?.trim();
  const challenge = `Bearer resource_metadata="${protectedResourceMetadataUrl}"`;

  const unauthorized = () => ({
    response: new Response(null, {
      status: 401,
      headers: { ...corsHeaders, "WWW-Authenticate": challenge },
    }),
  });

  if (!accessToken) return unauthorized();

  let verification: McpClaimsVerification;
  try {
    verification = await verifyClaims(accessToken) as McpClaimsVerification;
  } catch {
    return unauthorized();
  }

  const claims = verification.data?.claims;
  if (verification.error || !claims) return unauthorized();

  if (typeof claims.client_id !== "string" || !claims.client_id) {
    return {
      response: new Response(JSON.stringify({
        error: "Forbidden: token is not issued via OAuth for MCP access",
      }), {
        status: 403,
        headers: { ...corsHeaders, "content-type": "application/json" },
      }),
    };
  }

  return { accessToken };
}
