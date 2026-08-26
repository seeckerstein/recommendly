# Codex Project Handoff — Personal Recommendation Network

## Purpose

This document reconstructs the work completed with the previous Desktop Codex session so a new Codex CLI agent (currently using Ox Alpha through OpenRouter) can continue without losing important project and infrastructure context.

**Source of truth:** the actual repository and its current Git/Docker/Supabase state. This handoff records prior decisions and history; the new agent must verify them rather than assuming the conversation is current.

---

## 1. Product

Personal Recommendation Network: a private-by-default recommendation network for books, movies, restaurants, and later categories.

Core product principle: the API/domain layer is the canonical interface. Mobile, web, ChatGPT, Claude, and future LLM clients are clients of the same authorization model.

V1 includes:
- accounts/profiles
- public/private profiles
- subscription requests, approval, rejection, revocation, unsubscribe
- books, movies, restaurants
- recommendations with free-text comments
- optional metadata
- 1–5 star ratings
- tags
- comments
- re-recommendation as an independent recommendation
- feed/discovery/search
- notifications
- public API
- centralized authorization
- LLM/MCP interface

The PRD explicitly requires identical authorization for mobile/web/LLM clients and forbids LLM access from bypassing normal permissions.

---

## 2. Architecture / non-negotiable decisions

The implementation is intentionally **Supabase-first, API-first, LLM-native**.

Use:
- Supabase Postgres
- Supabase Auth
- PostgreSQL RLS
- Supabase Edge Functions (TypeScript/Deno)
- Supabase CLI migrations committed to Git
- Supabase local stack / Docker for development and integration tests
- React Native + Expo for mobile
- optional Next.js web client
- application-specific MCP server implemented through the product/domain layer
- Postgres full-text search for V1
- pgvector/semantic search only later

Do NOT introduce a separate Node/NestJS backend unless a concrete requirement makes it necessary.

The product's MCP server is different from Supabase's development MCP:
1. Supabase MCP = engineering/development tooling for the coding agent.
2. Product MCP = customer-facing LLM interface, authenticated as a specific user and restricted by the same domain authorization as REST.

Development MCP must never be connected to production.

SQL migrations are the schema source of truth. Any schema change must be represented by a committed migration.

---

## 3. Intended repository structure

Expected high-level structure:

recommendation-network/
  apps/
    mobile/
    web/                  # optional
  supabase/
    config.toml
    migrations/
    functions/
      api/
      mcp/
      notifications/
      enrich-recommendation/
    seed.sql
    tests/
  packages/
    domain/
    validation/
    api-client/
    shared-types/
  docs/
    PRD.md
    CODEX_BUILD_SPEC.md
    SECURITY.md
  .mcp.json
  AGENTS.md
  README.md
  package.json

The previous Desktop Codex session created/edited the project foundation and documentation. The actual repository should be inspected to determine the exact current state.

---

## 4. What the previous Desktop Codex session actually did

The reconstructed conversation shows that Desktop Codex:

### Initial foundation

Created the backend-first foundation before any mobile UI.

It added/edited project files including:
- `.env.example`
- `.gitignore`
- `AGENTS.md`
- `README.md`
- `docs/ACCEPTANCE_GATE.md`
- `docs/CODEX_BUILD_SPEC.md`
- `docs/PRD.md`
- `docs/SECURITY.md`
- `docs/openapi.yaml`
- `package.json`
- `packages/domain/src/recommendations.ts`
- `packages/domain/src/recommendations.test.ts`
- `pnpm-workspace.yaml`
- `supabase/config.toml`
- `supabase/functions/api/index.ts`
- an initial Supabase migration
- `supabase/tests/permission_matrix.sql`
- `tsconfig.json`

The agent reported that the backend-first foundation included:
- Supabase schema
- seeded V1 categories
- RLS/privacy boundary
- subscription workflow RLS
- permission-matrix SQL tests
- API Edge Function starting point
- OpenAPI contract
- Codex engineering rules
- backend acceptance gate
- product/build-spec summaries

### Local Supabase / Docker

Initially, Supabase CLI and Docker were not installed/available.

The previous workflow therefore paused full local integration testing until Docker Desktop and the Supabase CLI were available.

The intended local commands from the prior conversation were:

    cd C:\Users\seeckerstein\Documents\ChatGPT\recommendly

    pnpm add -D supabase

Then:

    pnpm exec supabase start
    pnpm exec supabase db reset
    pnpm exec supabase test db
    pnpm test

Important: the repository already had `supabase/config.toml`, so the prior agent explicitly said **do not run `supabase init` again**.

### Docker Desktop

The user installed Docker Desktop and confirmed it was running.

After Docker became available, the previous Codex session reported:

- local Supabase running
- database migrations applying successfully
- all 7 RLS privacy tests passing
- TypeScript and unit tests passing
- Supabase CLI installed as a project dependency
- generated local secrets excluded from Git

### Hosted development Supabase project

The previous session created a hosted Supabase development/staging project named approximately:

    recommendly-dev

This is development/staging only. There must be no production project or production MCP connection at this stage.

The user supplied the hosted project reference to the previous agent.

### Supabase CLI authentication

The Supabase dashboard UI had a broken Project/Organization selector. The previous conversation determined this was a dashboard UI issue rather than a user mistake.

The normal token-generation UI did not work correctly, so the conversation used the visible **legacy token / Create legacy token** fallback.

The previous agent instructed the user to create a short-lived development token named approximately:

    recommendly-local

The token was to be entered into the terminal only, never pasted into chat or committed to source.

The user ultimately authenticated the local Supabase CLI successfully.

Important security rule:
- Never place the Supabase access token in this handoff, source files, Git, or chat.
- If the old token still exists, it should be revoked after the required deployment/linking work.
- Verify `.gitignore` and environment/secrets handling before continuing.

### Migration deployment

At the end of the reconstructed conversation, the previous agent had authenticated successfully and performed a migration dry-run.

The reported dry-run was clean:
- only the two tested schema/RLS migrations were going to be applied
- no seed or unrelated changes were going to be deployed

The next intended action was to deploy those committed migrations to the hosted **development** project.

Do NOT blindly deploy until the new agent checks the current repository, migration history, and linked project.

---

## 5. Important troubleshooting history

### PowerShell / npm

The Windows machine originally had Node/npm installed, but PowerShell execution policy blocked `npm.ps1`.

The working workaround was:

    npm.cmd install -g @openai/codex

The user now has Codex CLI installed and verified as:

    codex-cli 0.149.1

PowerShell may still block `npm` / `codex` `.ps1` wrappers. The `.cmd` forms work:

    npm.cmd ...
    codex.cmd ...

Do not change system execution policy merely to make these wrappers work unless there is a reason to do so.

### Supabase CLI PATH

During the earlier project setup, `pnpm` was not reliably available as a global command in one terminal, while the Supabase CLI was already installed inside the repository's `node_modules`.

The working fallback was:

    .\node_modules\.bin\supabase.cmd login

or the equivalent project-local executable.

Before assuming a global `supabase` command exists, verify it.

### Supabase dashboard

The Project/Organization selector appeared disabled/greyed out because the organization selector had not been successfully chosen. The dashboard UI was behaving incorrectly.

The legacy-token fallback was used instead of continuing to fight the broken selector.

---

## 6. Current intended state

At the end of the reconstructed Desktop Codex work, the intended state was:

1. Backend-first repository exists.
2. Supabase local development is working through Docker.
3. Initial migrations and RLS tests pass locally.
4. TypeScript/unit tests pass.
5. A hosted development Supabase project exists.
6. Local Supabase CLI authentication to that project succeeded.
7. A migration dry-run against the hosted development project was clean.
8. The next step was to deploy the committed migrations to development, then expand API/domain behavior and permission tests.
9. Mobile UI should NOT be started until the backend acceptance gate passes.

The exact current state must now be checked from the repository and Supabase rather than assumed.

---

## 7. What the new Codex agent should do first

Before making changes:

1. Inspect `AGENTS.md`.
2. Read `docs/PRD.md`.
3. Read `docs/CODEX_BUILD_SPEC.md`.
4. Read `docs/ACCEPTANCE_GATE.md`.
5. Run `git status` and inspect recent commits/diff.
6. Inspect `supabase/migrations/`.
7. Inspect `supabase/tests/permission_matrix.sql`.
8. Inspect `supabase/config.toml`.
9. Inspect `.mcp.json` if present.
10. Verify Docker Desktop/local Supabase availability.
11. Verify the project-local Supabase CLI.
12. Determine whether the repository is currently linked to the intended development Supabase project.
13. Inspect migration history before applying anything remotely.
14. Check for secrets accidentally present in tracked files.
15. Only then propose the next action.

Do not modify anything during this initial inspection unless required to diagnose a concrete problem.

---

## 8. Backend acceptance gate

Do not begin mobile UI until these backend conditions pass:

- two users can register
- private recommendation cannot be read by an unapproved user
- subscription request does not grant access
- approval grants access
- revocation removes access
- public profile grants access
- re-recommendation creates an independent record
- ratings/comments obey recommendation visibility
- search obeys visibility rules
- REST/domain authorization tests pass
- database RLS tests pass

The permission matrix must cover:
- owner -> YES
- public profile -> YES
- approved subscriber -> YES
- pending subscriber -> NO
- rejected subscriber -> NO
- revoked subscriber -> NO
- unsubscribed -> NO
- anonymous -> NO
- LLM acting as approved user -> YES
- LLM acting as unapproved user -> NO

Child-table leakage must also be tested: comments and ratings must not expose private recommendations.

---

## 9. Security rules

Never:
- connect development MCP to production
- commit service-role keys
- commit Supabase access tokens
- expose service-role credentials to mobile/web/LLM clients
- bypass RLS using privileged access in user-facing flows
- make optional recommendation metadata mandatory
- create a custom backend merely for architectural preference
- weaken authorization to make tests pass

Use:
- migrations for schema changes
- RLS as mandatory database security
- caller-scoped Supabase clients for normal user operations
- tightly contained privileged access only for legitimate server-side workflows
- negative permission tests for every permission-sensitive feature

---

## 10. Next likely implementation sequence

After verifying the current state:

1. Finish/deploy the initial development schema if not already deployed.
2. Generate/update database types.
3. Expand domain/API Edge Function operations for users, recommendations, subscriptions, ratings, comments.
4. Complete permission tests.
5. Implement search with authorization.
6. Implement notifications.
7. Run the full backend acceptance gate.
8. Only after the gate passes, build the Expo mobile client.
9. Then build the application-specific product MCP server.
10. Add delegated OAuth/LLM authorization.
11. Add optional metadata enrichment.
12. Add semantic search only after V1 is stable.

---

## 11. Continuation philosophy

The previous Desktop Codex session did meaningful infrastructure work. Do not throw it away and do not recreate the repository from scratch.

The new agent should:
- preserve existing migrations
- preserve existing RLS policies unless inspection shows a concrete defect
- preserve the Docker/local Supabase workflow
- preserve the development/staging Supabase separation
- use the actual repository as the final source of truth
- reconcile this handoff with the current Git state
- explain any discrepancy before making architectural changes

If something in this handoff conflicts with the current repository, investigate the repository and Git history first.

---

## 12. User context

The user is a non-coder/founder and the intended architecture deliberately minimizes infrastructure they must administer manually.

Commands should be given in small, copy/paste-friendly PowerShell steps.

Avoid asking the user to paste secrets into chat.

When a command may modify database state, explain whether it is:
- local-only
- development/staging
- production

Production is not part of the current setup.
