import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, apikey, x-client-info",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
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
      .select("id, display_name, bio, avatar_url, profile_visibility, created_at")
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

    if (url.searchParams.get("scope") === "connected") {
      const ownerId = url.searchParams.get("owner_id");
      const { data: { user } } = await client.auth.getUser();
      if (!user) return json({ error: "Invalid authentication token" }, 401);
      let recQuery = client
        .from("recommendations")
        .select("*, profiles!user_id(id, display_name)")
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (ownerId) {
        recQuery = recQuery.eq("user_id", ownerId);
      }
      const { data, error } = await recQuery;
      const recs = (data ?? []).map((r: Record<string, unknown>) => {
        const profiles = r.profiles as { id: string; display_name: string } | null;
        const { profiles: _, ...rest } = r;
        return { ...rest, owner_id: profiles?.id ?? null, owner_name: profiles?.display_name ?? null };
      });
      return json(error ? { error: error.message } : { data: recs }, error ? 400 : 200);
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
    if (!body.category || (!body.title?.trim() && !body.comment?.trim())) {
      return json({ error: "category and a title or comment are required" }, 400);
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
        comment: body.comment?.trim() ? body.comment.trim() : null,
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
    const { data: deleted, error } = await client
      .from("recommendations")
      .delete()
      .eq("id", recId)
      .eq("user_id", user.id)
      .select();
    if (error) return json({ error: "Not found or not authorized" }, 404);
    if (!deleted || deleted.length === 0) return json({ error: "Not found or not authorized" }, 404);
    return json({ success: true }, 200);
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


  // ---------------------------------------------------------------------------
  // People discovery: GET /v1/users?q=
  // ---------------------------------------------------------------------------
  if (request.method === "GET" && url.pathname.endsWith("/v1/users")) {
    const raw = url.searchParams.get("q")?.trim() ?? "";
    if (!raw) return json({ error: "Search query is required" }, 400);
    // Escape PostgREST filter special characters to prevent filter injection.
    const q = raw.replace(/[,.()]/g, (ch) => "\\" + ch);

    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Invalid authentication token" }, 401);

    const { data, error } = await client
      .from("profiles")
      .select("id, email, display_name, bio, avatar_url, profile_visibility")
      .or(`email.ilike.*${q}*,display_name.ilike.*${q}*`)
      .neq("id", user.id)
      .limit(20);
    return json(error ? { error: error.message } : { data }, error ? 400 : 200);
  }

  // ---------------------------------------------------------------------------
  // User detail: GET /v1/users/:userId
  // ---------------------------------------------------------------------------
  const userMatch = url.pathname.match(/\/v1\/users\/([0-9a-f-]+)$/);
  if (request.method === "GET" && userMatch) {
    const targetUserId = userMatch[1];
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Invalid authentication token" }, 401);

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id, display_name, email, bio, avatar_url, profile_visibility")
      .eq("id", targetUserId)
      .single();
    if (profileError || !profile) return json({ error: "User not found" }, 404);

    if (user.id === targetUserId) {
      return json({ data: { ...profile, relationship: "SELF" } }, 200);
    }

    // Determine relationship state
    const { data: sub } = await client
      .from("subscriptions")
      .select("id, status")
      .eq("subscriber_id", user.id)
      .eq("publisher_id", targetUserId)
      .maybeSingle();

    let relationship = "NOT_CONNECTED";
    if (sub) relationship = sub.status;
    return json({ data: { ...profile, relationship, subscription_id: sub?.id ?? null } }, 200);
  }

  // ---------------------------------------------------------------------------
  // Subscriptions: GET /v1/subscriptions?type=
  // ---------------------------------------------------------------------------
  if (request.method === "GET" && url.pathname.endsWith("/v1/subscriptions")) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Invalid authentication token" }, 401);

    const type = url.searchParams.get("type") ?? "following";
    let query = client
      .from("subscriptions")
      .select("id, status, subscriber_id, publisher_id, requested_at, approved_at, profiles!subscriptions_publisher_id_fkey(id, display_name, avatar_url)");

    if (type === "subscribers") {
      query = query.eq("publisher_id", user.id);
    } else if (type === "pending_in") {
      query = query.eq("publisher_id", user.id).eq("status", "PENDING");
    } else if (type === "pending_out") {
      query = query.eq("subscriber_id", user.id).eq("status", "PENDING");
    } else {
      query = query.eq("subscriber_id", user.id);
    }

    const { data, error } = await query;
    return json(error ? { error: error.message } : { data }, error ? 400 : 200);
  }

  // ---------------------------------------------------------------------------
  // Request subscription: POST /v1/subscriptions
  // ---------------------------------------------------------------------------
  if (request.method === "POST" && url.pathname.endsWith("/v1/subscriptions")) {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
    const publisherId = body?.publisher_id;
    if (!publisherId) return json({ error: "publisher_id is required" }, 400);

    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Invalid authentication token" }, 401);
    if (user.id === publisherId) return json({ error: "Cannot subscribe to yourself" }, 400);

    const { data, error } = await client.rpc("request_subscription", { target_publisher_id: publisherId });
    if (error) {
      const msg = error.message;
      const status = msg.includes("already pending or approved") ? 409 : 400;
      return json({ error: msg }, status);
    }

    // Insert notification for the publisher
    const { error: notifError } = await client.from("notifications").insert({
      user_id: publisherId,
      type: "subscription_request",
      actor_user_id: user.id,
      reference_type: "subscription",
      reference_id: data.id,
    });
    if (notifError) {
      console.error("notification insert failed:", notifError.message);
      return json({ data, notification_created: false }, 207);
    }
    return json({ data }, 201);
  }

  // ---------------------------------------------------------------------------
  // Transition subscription: PATCH /v1/subscriptions/:id
  // ---------------------------------------------------------------------------
  const subIdMatch = url.pathname.match(/\/v1\/subscriptions\/([0-9a-f-]+)$/);
  if (request.method === "PATCH" && subIdMatch) {
    const subId = subIdMatch[1];
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
    const nextStatus = body?.status;
    if (!nextStatus || !["APPROVED", "REJECTED", "REVOKED"].includes(nextStatus)) {
      return json({ error: "Invalid status. Must be APPROVED, REJECTED, or REVOKED." }, 400);
    }

    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Invalid authentication token" }, 401);

    const { data, error } = await client.rpc("transition_subscription", { subscription_id: subId, next_status: nextStatus });
    if (error) return json({ error: error.message }, 400);

    // Insert notification for the subscriber (the other party)
    const actorId = nextStatus === "REVOKED" ? user.id : data.publisher_id;
    const notifyUserId = nextStatus === "REVOKED" ? data.publisher_id : data.subscriber_id;
    const notifType = nextStatus === "APPROVED" ? "subscription_approved" : nextStatus === "REJECTED" ? "subscription_rejected" : "access_revoked";
    const { error: notifError } = await client.from("notifications").insert({
      user_id: notifyUserId,
      type: notifType,
      actor_user_id: user.id,
      reference_type: "subscription",
      reference_id: data.id,
    });
    if (notifError) {
      console.error("notification insert failed:", notifError.message);
      return json({ data, notification_created: false }, 207);
    }
    return json({ data }, 200);
  }

  // ---------------------------------------------------------------------------
  // Unsubscribe: DELETE /v1/subscriptions/:publisherId
  // ---------------------------------------------------------------------------
  const unsubMatch = url.pathname.match(/\/v1\/subscriptions\/([0-9a-f-]+)\/unsubscribe$/);
  if (request.method === "DELETE" && unsubMatch) {
    const publisherId = unsubMatch[1];
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Invalid authentication token" }, 401);

    const { data, error } = await client.rpc("unsubscribe", { target_publisher_id: publisherId });
    if (error) return json({ error: error.message }, 400);
    return json({ data }, 200);
  }

  // ---------------------------------------------------------------------------
  // Notifications: GET /v1/notifications
  // ---------------------------------------------------------------------------
  if (request.method === "GET" && url.pathname.endsWith("/v1/notifications")) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Invalid authentication token" }, 401);

    const { data, error } = await client
      .from("notifications")
      .select("id, type, actor_user_id, reference_type, reference_id, read_at, created_at, profiles!notifications_actor_user_id_fkey(id, display_name, avatar_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    return json(error ? { error: error.message } : { data }, error ? 400 : 200);
  }

  // ---------------------------------------------------------------------------
  // Mark notification read: PATCH /v1/notifications/:id/read
  // ---------------------------------------------------------------------------
  const notifMatch = url.pathname.match(/\/v1\/notifications\/([0-9a-f-]+)\/read$/);
  if (request.method === "PATCH" && notifMatch) {
    const notifId = notifMatch[1];
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Invalid authentication token" }, 401);

    const { data, error } = await client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notifId)
      .eq("user_id", user.id)
      .select()
      .single();
    return json(error ? { error: error.message } : { data }, error ? 400 : 200);
  }

  return json({ error: "Not found" }, 404);
});
