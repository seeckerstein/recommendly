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

  if (request.method === "GET" && url.pathname.endsWith("/v1/me")) {
    const { data, error } = await client
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, profile_visibility, created_at")
      .eq("id", (await client.auth.getUser()).data.user?.id ?? "")
      .single();
    return json(error ? { error: error.message } : { data }, error ? 400 : 200);
  }

  if (request.method === "PATCH" && url.pathname.endsWith("/v1/me")) {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Invalid authentication token" }, 401);

    const allowed = ["username", "display_name", "bio", "avatar_url", "profile_visibility"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) return json({ error: "No valid fields to update" }, 400);

    const { data, error } = await client
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    return json(error ? { error: error.message } : { data }, error ? 400 : 200);
  }
  if (request.method === "GET" && url.pathname.endsWith("/v1/recommendations")) {
    const query = url.searchParams.get("q");
    if (query) {
      const { data, error } = await client
        .from("recommendations")
        .select("*")
        .or(`comment.fts.${query},title.fts.${query}`)
        .order("created_at", { ascending: false })
        .limit(100);
      return json(error ? { error: error.message } : { data }, error ? 400 : 200);
    }

    if (url.searchParams.get("scope") === "mine") {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return json({ error: "Invalid authentication token" }, 401);
      const { data, error } = await client
        .from("recommendations")
        .select("*")
        .eq("user_id", user.id)
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

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user) {
      return json({ error: "Invalid authentication token" }, 401);
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
        user_id: user.id,
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

  const singleRecMatch = url.pathname.match(/\/v1\/recommendations\/([0-9a-f-]+)$/);
  if (singleRecMatch && (request.method === "PATCH" || request.method === "DELETE")) {
    const recId = singleRecMatch[1];
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Invalid authentication token" }, 401);

    if (request.method === "PATCH") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
      const allowed = ["title", "comment", "rating", "tags", "metadata", "category_id"];
      const updates: Record<string, unknown> = {};
      for (const key of allowed) {
        if (key in body) updates[key] = body[key];
      }
      if (Object.keys(updates).length === 0) return json({ error: "No valid fields to update" }, 400);

      const { data, error } = await client
        .from("recommendations")
        .update(updates)
        .eq("id", recId)
        .eq("user_id", user.id)
        .select()
        .single();
      return json(
        error ? { error: error.message === 'JSON object requested, multiple (or no) rows returned!' ? "Not found or not authorized" : error.message } : { data },
        error ? 404 : 200
      );
    }

    // DELETE - hard delete (supported by RLS owner policy)
    const { error } = await client
      .from("recommendations")
      .delete()
      .eq("id", recId)
      .eq("user_id", user.id);
    return json(error ? { error: "Not found or not authorized" } : { success: true }, error ? 404 : 200);
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
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user) {
      return json({ error: "Invalid authentication token" }, 401);
    }
    const { data, error } = await client
      .from("recommendations")
      .insert({
        user_id: user.id,
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
