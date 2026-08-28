// Recommendly MCP tool definitions and implementations.
// This module is imported by supabase/functions/mcp/index.ts (Edge Function)
// and by packages/domain/src/mcp-tools.test.ts (unit tests).
// Tool implementations are thin wrappers over the existing Recommendly REST
// API so all authorization and RLS rules remain enforced by the backend.

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const CATEGORY_DESCRIPTION = "One of: book, movie, restaurant.";

export const tools = [
  {
    name: "get_my_recommendations",
    description:
      "List the authenticated Recommendly user's own recommendations. " +
      "Supports optional filtering by category (book, movie, restaurant), " +
      "free-text search across title and comment, and a result limit. " +
      "Use this whenever the user asks what they have recommended, to find " +
      "a specific recommendation, or to look something up before editing it.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["book", "movie", "restaurant"],
          description: "Filter by category. Omit to return all categories.",
        },
        search: {
          type: "string",
          description: "Free-text search across title and comment.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Maximum number of recommendations to return (default 20).",
        },
      },
      required: [],
    },
  },
  {
    name: "create_recommendation",
    description:
      "Create a new recommendation for the authenticated Recommendly user. " +
      "Requires a category and a comment explaining why the user loves it. " +
      "Title, rating (1-5), tags, and category-specific metadata are optional.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["book", "movie", "restaurant"],
          description: CATEGORY_DESCRIPTION,
        },
        comment: {
          type: "string",
          minLength: 1,
          description: "Why the user recommends this. Required.",
        },
        title: { type: "string", description: "Title of the book/movie/restaurant." },
        rating: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          description: "Rating from 1 to 5.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Free-form tags.",
        },
        metadata: {
          type: "object",
          description:
            "Category-specific metadata (e.g. author/genre for books, " +
            "director/platform for movies, location/cuisine for restaurants).",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "update_recommendation",
    description:
      "Update an existing recommendation that belongs to the authenticated " +
      "Recommendly user. Requires the recommendation id (obtain it from " +
      "get_my_recommendations). Only supplied fields are updated. " +
      "Ownership is enforced server-side; you cannot edit another user's " +
      "recommendation.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          format: "uuid",
          description: "The recommendation id to update.",
        },
        category: {
          type: "string",
          enum: ["book", "movie", "restaurant"],
          description: "Change the category if supplied.",
        },
        comment: { type: "string", minLength: 1, description: "Updated comment." },
        title: { type: "string", description: "Updated title." },
        rating: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          description: "Updated rating from 1 to 5.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Updated tags.",
        },
        metadata: {
          type: "object",
          description: "Updated category-specific metadata.",
        },
      },
      required: ["id"],
    },
  },
];

// ---------------------------------------------------------------------------
// Recommendly API client (server-side; uses the caller's access token)
// ---------------------------------------------------------------------------

export const API_BASE = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/api`;

export function apiHeaders(accessToken: string, extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function apiFetch(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: apiHeaders(accessToken, (init.headers ?? {}) as Record<string, string>),
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

// ---------------------------------------------------------------------------
// Tool implementations (thin wrappers over the existing REST API)
// ---------------------------------------------------------------------------

export function cleanRecommendation(rec: Record<string, unknown>) {
  // Only expose fields useful to the LLM. Include id because update_recommendation needs it.
  return {
    id: rec.id,
    category: rec.category_slug ?? rec.category_id,
    title: rec.title ?? null,
    comment: rec.comment,
    rating: rec.rating ?? null,
    tags: rec.tags ?? [],
    metadata: rec.metadata ?? {},
    created_at: rec.created_at,
  };
}

export async function toolGetMyRecommendations(
  accessToken: string,
  args: Record<string, unknown>,
) {
  const params = new URLSearchParams({ scope: "mine" });
  if (typeof args.limit === "number" && args.limit > 0) {
    params.set("limit", String(Math.min(args.limit, 100)));
  }
  const { status, body } = await apiFetch(accessToken, `/v1/recommendations?${params.toString()}`);
  if (status !== 200) {
    throw new Error(`Recommendly API error (${status})`);
  }
  let recs = ((body as { data?: unknown[] }).data ?? []) as Record<string, unknown>[];

  // Resolve category slugs using the categories table.
  const catRes = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/categories?select=id,slug`, {
    headers: apiHeaders(accessToken, { apikey: Deno.env.get("SUPABASE_ANON_KEY")! }),
  });
  if (catRes.ok) {
    const cats = (await catRes.json()) as { id: string; slug: string }[];
    const catMap = new Map(cats.map((c) => [c.id, c.slug]));
    recs = recs.map((r) => ({ ...r, category_slug: catMap.get(String(r.category_id)) ?? r.category_id }));
  }

  // Filter by category if requested
  if (typeof args.category === "string") {
    recs = recs.filter((r) => r.category_slug === args.category);
  }

  // Free-text search across title and comment
  if (typeof args.search === "string" && args.search.trim()) {
    const needle = args.search.trim().toLowerCase();
    recs = recs.filter((r) =>
      String(r.title ?? "").toLowerCase().includes(needle) ||
      String(r.comment ?? "").toLowerCase().includes(needle)
    );
  }

  return recs.slice(0, typeof args.limit === "number" ? args.limit : 20).map(cleanRecommendation);
}

export const CATEGORY_SLUGS = new Set(["book", "movie", "restaurant"]);

export async function toolCreateRecommendation(
  accessToken: string,
  args: Record<string, unknown>,
) {
  if (!CATEGORY_SLUGS.has(String(args.category))) {
    throw new Error(`Unsupported category: ${args.category}`);
  }
  if (args.rating !== undefined && args.rating !== null) {
    const r = Number(args.rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      throw new Error("Rating must be an integer from 1 to 5.");
    }
    args.rating = r;
  }
  const { status, body } = await apiFetch(accessToken, "/v1/recommendations", {
    method: "POST",
    body: JSON.stringify(args),
  });
  if (status !== 201) {
    const message = (body as { error?: string })?.error ?? `Recommendly API error (${status})`;
    throw new Error(message);
  }
  const data = (body as { data?: Record<string, unknown> }).data;
  return data ? [cleanRecommendation(data)] : [];
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function toolUpdateRecommendation(
  accessToken: string,
  args: Record<string, unknown>,
) {
  const id = String(args.id ?? "");
  if (!UUID_RE.test(id)) {
    throw new Error("A valid recommendation id is required (use get_my_recommendations to find it).");
  }
  const patch: Record<string, unknown> = {};
  for (const key of ["title", "comment", "rating", "tags", "metadata"] as const) {
    if (args[key] !== undefined) patch[key] = args[key];
  }
  if (args.rating !== undefined && args.rating !== null) {
    const r = Number(args.rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      throw new Error("Rating must be an integer from 1 to 5.");
    }
    patch.rating = r;
  }
  if (args.category !== undefined) {
    if (!CATEGORY_SLUGS.has(String(args.category))) {
      throw new Error(`Unsupported category: ${args.category}`);
    }
    const catRes = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/categories?select=id,slug&slug=eq.${args.category}`, {
      headers: apiHeaders(accessToken, { apikey: Deno.env.get("SUPABASE_ANON_KEY")! }),
    });
    if (!catRes.ok) throw new Error("Failed to resolve category.");
    const cats = (await catRes.json()) as { id: string; slug: string }[];
    const cat = cats[0];
    if (!cat) throw new Error(`Unsupported category: ${args.category}`);
    patch.category_id = cat.id;
  }
  if (Object.keys(patch).length === 0) {
    throw new Error("No fields to update.");
  }
  const { status, body } = await apiFetch(accessToken, `/v1/recommendations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (status !== 200) {
    const message = (body as { error?: string })?.error ?? `Recommendly API error (${status})`;
    throw new Error(message);
  }
  const data = (body as { data?: Record<string, unknown> }).data;
  return data ? [cleanRecommendation(data)] : [];
}

export const toolHandlers: Record<string, (accessToken: string, args: Record<string, unknown>) => Promise<unknown>> = {
  get_my_recommendations: toolGetMyRecommendations,
  create_recommendation: toolCreateRecommendation,
  update_recommendation: toolUpdateRecommendation,
};