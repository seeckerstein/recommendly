# Security model

Authorization is enforced in PostgreSQL RLS and must be preserved by Edge Functions and any future MCP tools. The database distinguishes public profile visibility from an approved subscription. Only the recommendation owner can modify a recommendation; only viewers authorized to read a recommendation may rate or comment on it.

Use caller-scoped Supabase clients in user-facing Edge Functions. Service-role access, if ever required for operational work, is not permitted to decide or bypass user access.

## Push subscriptions and dispatch

Push delivery follows the same authorization model as every other
recommendation feature:

- `push_subscriptions` is RLS-scoped to each user's own rows; the
  authenticated API derives ownership from the verified bearer token, never
  from request JSON.
- The push dispatcher Edge Function is invoked server-side with a dedicated
  secret. It uses service-role access only to fan out delivery of an
  already-created, already-authorized notification and never as an
  authorization shortcut.
- Private VAPID credentials and the dispatcher secret live server-side only.
- Push payloads contain display text and click routing only; they never
  carry private recommendation content or open new read paths.
