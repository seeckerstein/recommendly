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
