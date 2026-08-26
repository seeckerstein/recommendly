import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "content-type": "application/json" };

Deno.serve(async (request) => {
  const authorization = request.headers.get("Authorization");
  if (!authorization)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  );
  const url = new URL(request.url);
  if (
    request.method === "GET" &&
    url.pathname.endsWith("/v1/recommendations")
  ) {
    const { data, error } = await client
      .from("recommendations")
      .select("*")
      .order("created_at", { ascending: false });
    return new Response(
      JSON.stringify(error ? { error: error.message } : { data }),
      { status: error ? 400 : 200, headers: corsHeaders },
    );
  }
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: corsHeaders,
  });
});
