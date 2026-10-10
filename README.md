# Personal Recommendation Network

A private-by-default recommendation network for books, movies, and restaurants.

## Current milestone

This repository intentionally starts with the Supabase backend foundation. The mobile UI and customer-facing MCP integration begin only after the database authorization acceptance gate passes.

## Local setup

1. Install the Supabase CLI and Docker Desktop.
2. Copy `.env.example` to `.env` and add only development-project values.
3. Run `pnpm install`, then `pnpm supabase:start`.
4. Apply the migration with `supabase db reset` and run `pnpm test:db`.

**Supabase production target:** the only hosted Recommendly project is `recommendly-dev` (`zpjsmuuxgcewmymmdddr`), confirmed by the owner as the production project; there is no separate production project. The dashboard shows the `PRODUCTION` environment badge even though the project name includes `-dev`. Keep local development and DB tests on the local Supabase stack; do not point disposable development tooling or destructive reset commands at the hosted project. Commit every schema change as a migration and verify migration history before any explicitly authorized production deployment.

## Supabase deployment workflow

Supabase database migrations and Edge Functions are separate deployment artifacts. Applying migrations does **not** deploy updated Edge Function code, and deploying an Edge Function does **not** apply database migrations. A feature that changes both may require both steps.

For an explicitly authorized production release:

1. Merge the reviewed source and migration files to `main`.
2. Inspect the hosted project's migration history and dry-run pending migrations with the project-local Supabase CLI; apply only the intended committed migrations.
3. Separately deploy each changed Edge Function from the verified merged source using the project-local CLI and explicit production ref `zpjsmuuxgcewmymmdddr`.
4. Retrieve/inspect the deployed function source or otherwise verify its version contains the expected handler, then perform a safe authenticated smoke test where possible.
5. Verify the application behavior. A successful database migration or function deployment alone is not end-to-end verification.

Do not assume the Supabase GitHub integration automatically deploys every artifact. Confirm the configured workflow. Never deploy functions or migrations to production without explicit authorization.

## Push notifications

Browser push (Chrome desktop and installed Android PWA) is layered on the
existing Activity notifications; email behaviour is unchanged and separate.
The four Activity types (`subscription_request`, `subscription_approved`,
`subscription_rejected`, `access_revoked`) are dispatched asynchronously to
all registered devices of the recipient.

Provision push by adding these Vault secrets (matching the dispatcher Edge
Function secrets):

```sql
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/push-dispatcher', 'push_dispatcher_function_url');
select vault.create_secret('<same value as PUSH_DISPATCHER_SECRET>', 'push_dispatcher_secret');
```

Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `PUSH_DISPATCHER_SECRET` as
Edge Function secrets, and expose `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to the web
client. Push stays silently disabled until Vault is provisioned.

## Weekly recommendation email

The digest runs Fridays at 16:00 UTC (the app has no per-user timezone setting). Deploy `weekly-recommendations-email` with `RESEND_API_KEY` and `WEEKLY_DIGEST_CRON_SECRET` set as Edge Function secrets. The database migration installs Vault but leaves delivery unscheduled. After adding the function URL, matching bearer secret, and production publishable key to Vault, activate it by calling `public.enable_weekly_recommendations_email_schedule()` as `postgres`:

```sql
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/weekly-recommendations-email', 'weekly_digest_function_url');
select vault.create_secret('<same value as WEEKLY_DIGEST_CRON_SECRET>', 'weekly_digest_cron_secret');
select vault.create_secret('<production publishable key>', 'weekly_digest_publishable_key');
select public.enable_weekly_recommendations_email_schedule();
```

The digest skips accounts with no currently accessible recommendations. Its database query applies the same `can_view_recommendation` predicate as recommendation RLS.

### Recovering an interrupted digest

The function sends sequentially but does not persist per-recipient send records or use a delivery idempotency key. The cron records the HTTP request result, not which recipients were accepted by Resend. A failed run may therefore have sent some emails; never replay it as a full batch without checking provider events.

For a controlled recovery, first inspect Resend events around the failed run. Retry only recipients confirmed to have no accepted message (or a confirmed failed/bounced message that should be retried); exclude any recipient whose outcome is uncertain. After the reviewed function fix is separately deployed, send a manual `POST` to the URL in `weekly_digest_function_url` with the same `apikey` and bearer authorization headers used by the cron, and a JSON body containing only the selected IDs: `{"recipient_ids":["<recipient-uuid>"]}`. The function rechecks current email preferences and recommendation access. Review `sent`, `skipped`, `failed`, and `failed_user_ids`; HTTP 207 indicates at least one recipient failed. Check Resend events before retrying any failed request because an accepted message could still have been delivered. Keep the Vault values in the approved secret manager and out of shell history, logs, and PRs.

An empty body or `{}` retains the scheduled full-batch behavior. Do not use either for incident recovery; the endpoint has no durable deduplication and a repeated targeted request can also send duplicates.

## Repository map

- `supabase/migrations`: canonical Postgres schema, RLS, and database functions
- `supabase/functions/api`: authenticated API/domain-function entry point
- `supabase/tests`: permission and privacy integration tests
- `packages/domain`: shared domain contracts and validation
- `docs`: product, architecture, API, and security decisions

## Connecting Recommendly to Claude

Recommendly is available to Claude as a remote MCP (Model Context Protocol) server. Once connected, you can ask Claude to read and manage your recommendations conversationally.

### Setup

1. In Claude, open **Customize → Connectors**.
2. Click **+ / Add custom connector**.
3. Name it **Recommendly**.
4. Enter the Recommendly MCP server URL: `https://zpjsmuuxgcewmymmdddr.supabase.co/functions/v1/mcp`
5. Click **Add**.
6. Authenticate with your Recommendly account when prompted and approve access.
7. Enable **Recommendly** from the chat's connectors menu.

### What you can ask Claude

- "Show me my recommendations."
- "Show me recommendations from people I'm connected to."
- "Show me recommendations from [person]."
- "Add The Hobbit to my recommendations."
- "Add The Rookie as a series with 3 stars."
- "Show me series recommendations from my connections."
- "Add a recommendation for a podcast." (Recommendly will store it under the "other" category with metadata type = podcast.)
- "Update my recommendation for The Hobbit."

Claude only receives recommendations you are authorized to access — never anyone else's private data.

## Connecting Recommendly to ChatGPT

ChatGPT can use the same Recommendly remote MCP server (same URL, same OAuth model, same authorization). As of this writing, ChatGPT's custom-connector support may require a Plus/Pro plan or may be in beta — follow ChatGPT's current documentation for adding a custom MCP connector, then use the same server URL above.

## Developer note: WebMCP

WebMCP (browser-native MCP) is considered complementary and future-facing. Recommendly's current architecture uses a hosted remote MCP server, which is intentionally shared across clients (Claude, ChatGPT, future integrations). No WebMCP runtime changes are planned in this checkpoint.
