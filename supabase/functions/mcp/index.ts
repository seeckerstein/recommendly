// Recommendly MCP server (Streamable HTTP).
// Exposes Recommendly capabilities as MCP tools for external LLM clients.
//
// Authentication: the MCP client supplies the user's Recommendly access token
// via the "Authorization: Bearer <access_token>" header on every request.
// Every tool call is executed against the existing Recommendly REST API using
// that identity, so all authorization and RLS rules remain enforced by the
// backend. The MCP layer holds no service-role or database credentials.
//
// Tool implementations live in ./mcp-tools.ts (shared with unit tests).

import { tools, toolHandlers } from "./mcp-tools.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ALLOWED_ORIGINS = (Deno.env.get("MCP_ALLOWED_ORIGINS") ?? "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "access-control-allow-headers": "authorization, content-type, mcp-session-id",
    "access-control-allow-methods": "POST, GET, DELETE, OPTIONS",
    "access-control-expose-headers": "mcp-session-id",
  };
  if (ALLOWED_ORIGINS.includes("*") || (origin && ALLOWED_ORIGINS.includes(origin))) {
    headers["access-control-allow-origin"] = origin ?? "*";
  }
  return headers;
}

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

// ---------------------------------------------------------------------------
// MCP protocol helpers (JSON-RPC 2.0)
// ---------------------------------------------------------------------------

const PROTOCOL_VERSION = "2025-03-26";
const SERVER_INFO = { name: "recommendly", version: "0.1.0" };

const ERR_PARSE = -32700;
const ERR_INVALID_REQUEST = -32600;
const ERR_METHOD_NOT_FOUND = -32601;

function result(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function error(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleMessage(
  message: { id?: unknown; method?: string; params?: Record<string, unknown> },
  accessToken: string,
): Promise<unknown> {
  const { id, method, params } = message;

  switch (method) {
    case "initialize":
      return result(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "notifications/initialized":
      return undefined; // notification: no response

    case "ping":
      return result(id, {});

    case "tools/list":
      return result(id, { tools });

    case "tools/call": {
      const name = String(params?.name ?? "");
      const handler = toolHandlers[name];
      if (!handler) {
        return error(id, -32602, `Unknown tool: ${name}`);
      }
      const args = (params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const data = await handler(accessToken, args);
        return result(id, {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
        });
      } catch (e) {
        return result(id, {
          content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
          isError: true,
        });
      }
    }

    default:
      return error(id, ERR_METHOD_NOT_FOUND, `Method not found: ${method}`);
  }
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname.endsWith("/mcp")) {
    return json({ status: "ok", server: SERVER_INFO, protocolVersion: PROTOCOL_VERSION }, 200, cors);
  }

  if (request.method === "DELETE" && url.pathname.endsWith("/mcp")) {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== "POST" || !url.pathname.endsWith("/mcp")) {
    return json({ error: "Not found" }, 404, cors);
  }

  // Authentication: the MCP client must supply the user's Recommendly access
  // token. This proves identity for every tool call without exposing secrets.
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized: missing or invalid Authorization header" }, 401, cors);
  }
  const accessToken = auth.slice(7).trim();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(error(null, ERR_PARSE, "Invalid JSON"), 400, cors);
  }

  if (Array.isArray(body)) {
    const responses = [];
    for (const msg of body) {
      if (typeof msg !== "object" || msg === null) {
        responses.push(error(null, ERR_INVALID_REQUEST, "Invalid request"));
        continue;
      }
      const res = await handleMessage(msg as { id?: unknown; method?: string; params?: Record<string, unknown> }, accessToken);
      if (res !== undefined) responses.push(res);
    }
    return json(responses, 200, cors);
  }

  if (typeof body !== "object" || body === null) {
    return json(error(null, ERR_INVALID_REQUEST, "Invalid request"), 400, cors);
  }

  const msg = body as { id?: unknown; method?: string; params?: Record<string, unknown> };
  const response = await handleMessage(msg, accessToken);
  return json(response ?? {}, 200, cors);
});