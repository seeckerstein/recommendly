# Security model

Authorization is enforced in PostgreSQL RLS and must be preserved by Edge Functions and any future MCP tools. The database distinguishes public profile visibility from an approved subscription. Only the recommendation owner can modify a recommendation; only viewers authorized to read a recommendation may rate or comment on it.

Use caller-scoped Supabase clients in user-facing Edge Functions. Service-role access, if ever required for operational work, is not permitted to decide or bypass user access.
