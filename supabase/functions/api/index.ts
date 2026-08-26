import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "content-type": "application/json" };

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

Deno.serve(async (request) => {
  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "Unauthorized" }, 401);

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  );

  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname.endsWith("/v1/recommendations")) {
    const query = url.searchParams.get("q");
    if (query) {
      const { data, error } = await client
        .from("recommendations")
        .select("*")
        .textSearch("title", query, { type: "websearch", config: "simple" })
        .order("created_at", { ascending: false })
        .limit(100);
      return json(error ? { error: error.message } : { data }, error ? 400 : 200);
    }

    const { data, error } = await client
      .from("recommendations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return json(error ? { error: error.message } : { data }, error ? 400 : 200);
  }

  if (request.method === "POST" && url.pathname.endsWith("/v1/recommendations")) {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    if (!body.category || !body.comment?.trim()) {
      return json({ error: "category and comment are required" }, 400);
    }

    const { data: category, error: categoryError } = await client
      .from("categories")
      .select("id")
      .eq("slug", body.category)
      .eq("active", true)
      .single();
    if (categoryError || !category) {
      return json({ error: `Unknown or inactive category: ${body.category}` }, 400);
    }

    const { data, error } = await client
      .from("recommendations")
      .insert({
        category_id: category.id,
        comment: body.comment,
        title: body.title ?? null,
        rating: body.rating ?? null,
        tags: body.tags ?? [],
        metadata: body.metadata ?? {},
      })
      .select()
      .single();
    return json(error ? { error: error.message } : { data }, error ? 400 : 201);
  }

  const recommendMatch = url.pathname.match(/\/v1\/recommendations\/([0-9a-f-]+)\/recommend$/);
  if (recommendMatch && request.method === "POST") {
    const sourceId = recommendMatch[1];
    const { data: source, error: sourceError } = await client
      .from("recommendations")
      .select("*")
      .eq("id", sourceId)
      .single();
    if (sourceError || !source) {
      return json({ error: "Recommendation not found or access denied" }, 404);
    }
    const { data, error } = await client
      .from("recommendations")
      .insert({
        category_id: source.category_id,
        comment: source.comment ?? "",
        title: source.title,
        rating: source.rating,
        tags: source.tags,
        metadata: source.metadata,
      })
      .select()
      .single();
    return json(error ? { error: error.message } : { data }, error ? 400 : 201);
  }

  return json({ error: "Not found" }, 404);
});
