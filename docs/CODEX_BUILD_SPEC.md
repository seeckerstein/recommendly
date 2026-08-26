# Build specification summary

Use a Supabase-first, API-first TypeScript architecture: Supabase Postgres and Auth, RLS for row visibility, Edge Functions for workflow/domain operations, committed migrations, and a future user-authorized product MCP endpoint. The customer-facing MCP server is distinct from development Supabase MCP tooling.

The initial delivery is backend-only: schema, category seed data, authorization policies, permission tests, API/domain skeleton, generated database contracts, and OpenAPI documentation. Keep a separate development/staging Supabase project and never expose service-role credentials.

Source: `C:\Users\seeckerstein\Downloads\recommendation_network_codex_build_spec.docx`.
