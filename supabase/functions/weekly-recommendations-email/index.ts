import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  parseWeeklyDigestRecipientIds,
  renderWeeklyDigest,
  shouldSendWeeklyDigest,
  type DigestRecommendation,
} from "../_shared/weekly-digest.ts";

const appUrl = "https://www.youdlike.me/discover-recommendations";

Deno.serve(async (request) => {
  if (request.method !== "POST")
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  const cronSecret = Deno.env.get("WEEKLY_DIGEST_CRON_SECRET");
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestBody: unknown = {};
  try {
    const bodyText = await request.text();
    if (bodyText.trim()) requestBody = JSON.parse(bodyText);
  } catch {
    return Response.json(
      { error: "Invalid JSON request body" },
      { status: 400 },
    );
  }
  const scope = parseWeeklyDigestRecipientIds(requestBody);
  if (!scope.valid) {
    return Response.json(
      {
        error: "recipient_ids must be a non-empty array of UUIDs when provided",
      },
      { status: 400 },
    );
  }
  const recipientIds = scope.recipientIds;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey)
    return Response.json(
      { error: "RESEND_API_KEY is not configured" },
      { status: 500 },
    );

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  let profileQuery = serviceClient
    .from("profiles")
    .select("id, email, user_settings(email_weekly_recommendations)")
    .not("email", "is", null);
  if (recipientIds) profileQuery = profileQuery.in("id", recipientIds);
  const { data: profiles, error } = await profileQuery;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const from =
    Deno.env.get("RESEND_FROM_EMAIL") ?? "YOU'D LIKE <no-reply@youdlike.me>";
  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];
  const foundProfileIds = new Set(
    (profiles ?? []).map((profile) => profile.id),
  );
  for (const recipientId of recipientIds ?? []) {
    if (!foundProfileIds.has(recipientId)) {
      failures.push(recipientId);
      console.error("weekly digest target unavailable", recipientId);
    }
  }

  for (const profile of profiles ?? []) {
    let failureStage = "recipient evaluation";
    try {
      const setting = Array.isArray(profile.user_settings)
        ? profile.user_settings[0]
        : profile.user_settings;
      const digestEnabled = setting?.email_weekly_recommendations !== false;
      if (!profile.email || !digestEnabled) {
        skipped++;
        continue;
      }

      failureStage = "recommendation query";
      const { data: recommendations, error: queryError } =
        await serviceClient.rpc("weekly_digest_recommendations", {
          recipient_id: profile.id,
        });
      if (queryError) throw new Error(queryError.message);
      const available = (recommendations ?? []) as DigestRecommendation[];
      // Follow the product's existing email convention: don't send an empty digest.
      if (!shouldSendWeeklyDigest(digestEnabled, available)) {
        skipped++;
        continue;
      }

      failureStage = "email rendering";
      const html = renderWeeklyDigest(available, appUrl);
      failureStage = "email delivery";
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [profile.email],
          subject: "Your weekly recommendations from YOU'D LIKE",
          html,
        }),
      });
      if (!response.ok) {
        throw new Error(`Resend returned HTTP ${response.status}`);
      }
      sent++;
    } catch (recipientError) {
      failures.push(profile.id);
      console.error("weekly digest recipient failed", {
        recipient_id: profile.id,
        stage: failureStage,
        error:
          recipientError instanceof Error
            ? recipientError.message
            : String(recipientError),
      });
    }
  }
  return Response.json(
    { sent, skipped, failed: failures.length, failed_user_ids: failures },
    { status: failures.length ? 207 : 200 },
  );
});
