# Personal Recommendation Network

A private-by-default recommendation network for books, movies, and restaurants.

## Current milestone

This repository intentionally starts with the Supabase backend foundation. The mobile UI and customer-facing MCP integration begin only after the database authorization acceptance gate passes.

## Local setup

1. Install the Supabase CLI and Docker Desktop.
2. Copy `.env.example` to `.env` and add only development-project values.
3. Run `pnpm install`, then `pnpm supabase:start`.
4. Apply the migration with `supabase db reset` and run `pnpm test:db`.

Never connect development MCP tooling to production. Commit every schema change as a migration.

## Repository map

- `supabase/migrations`: canonical Postgres schema, RLS, and database functions
- `supabase/functions/api`: authenticated API/domain-function entry point
- `supabase/tests`: permission and privacy integration tests
- `packages/domain`: shared domain contracts and validation
- `docs`: product, architecture, API, and security decisions
