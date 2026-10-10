# Recommendly Agent Instructions

This file is the operational contract for coding agents working in this repository.

## 1. Instruction precedence

Use this order when instructions conflict:

1. The user's current request and explicit constraints.
2. The current repository, executable code, tests, and committed migrations.
3. This `AGENTS.md`.
4. Current product/security documentation under `docs/`.
5. Historical notes.

Historical task/checkpoint files are not authoritative. Do not resurrect completed work from them.

## 2. Environment

Read `environment.md` before diagnosing tooling, versions, credentials, deployment access, or local Supabase/Docker issues.

The verified Windows development environment uses:
- Node 26.8.1
- npm 11.19.0
- Git 2.56.0.windows.2
- GitHub CLI 2.102.0
- Vercel CLI 63.1.0
- global Supabase CLI 2.120.0
- Docker 29.8.2 / Compose 5.5.1
- Codex 0.162.0

Recommendly intentionally uses its project-pinned pnpm 11.19.0 and project-local Supabase CLI dependency. Do not upgrade project dependencies merely to match global tools.

On Windows/Codex, do not "fix" missing tools by changing the Windows Machine PATH. The Codex configuration explicitly supplies stable tool paths; keep that configuration intact.

If a command fails, first classify it as:
- project/code failure,
- repository state problem,
- authentication/access problem, or
- agent/environment limitation.

Do not modify application code to work around an environment failure.

If the same environment problem fails twice, stop and report it. Do not loop.

## 3. Git is the source of truth

All repository changes follow normal Git flow.

Before changing anything:
- inspect `git status`;
- inspect the current branch;
- inspect relevant existing code/migrations/tests;
- do not overwrite unrelated work.

During work:
- make small, deterministic edits;
- inspect `git diff` after meaningful changes;
- run `git diff --check`.

Before commit:
- only intended files may be changed;
- no secrets, generated files, temporary files, or unrelated formatting churn;
- tests/checks must be run and reported honestly.

Use feature branches and pull requests. Do not bypass Git by changing remote systems directly.

Do not commit, push, merge, or deploy unless the user explicitly authorizes that action.

## 4. Editing discipline

Do not use `apply_patch` in this Windows environment.

Do not use giant PowerShell string replacements or whole-file rewrites for small edits.

Preserve existing line endings and formatting. If a small change creates a huge diff, stop and inspect it before proceeding.

Never repeatedly transform a malformed file. If an edit goes wrong:
1. stop;
2. restore the affected file from Git if appropriate;
3. make one deterministic edit;
4. inspect the diff;
5. continue only when the structure is correct.

Never touch `youdlike_logo.png` unless the user explicitly asks.

## 5. Product and security invariants

Recommendly is private by default. Authorization is a product feature and the database is part of the application.

Never weaken authorization to make a test or UI flow pass.

- RLS is mandatory for user-facing data.
- Database migrations are the source of truth for schema changes.
- Never make dashboard-only schema changes.
- Never use service-role access as a general user-authorization bypass.
- SECURITY DEFINER functions must be narrow, caller-aware, and use a safe search_path.
- Verify identity from authenticated/verified claims; never trust a client-supplied user_id for ownership.
- Child tables must not leak data about inaccessible parent records.
- API and MCP must use the same authorization model.
- Search/filter input must be escaped as required by PostgREST syntax.

### Directional subscription semantics

Access is directional and must remain so.

If A requests access to B:
- A -> B is pending.
- B approving A -> B gives A access to B.
- B does not automatically receive access to A.
- B -> A requires a separate request and approval.

Do not introduce reciprocal/friendship semantics that hide the two independent directions.

Subscription lifecycle changes and notifications must preserve the correct actor, recipient, direction, and subscription reference.

## 6. Database and Supabase

Use committed migrations for schema changes.

Before a migration:
1. inspect current schema, policies, grants, functions, indexes, and constraints;
2. determine the real starting state;
3. make the migration safe for that state;
4. add regression/security coverage.

After a migration:
- run local database reset/application;
- run database tests;
- inspect the migration diff;
- verify no unrelated schema changes.

Use the project-local Supabase CLI for project operations. The owner has confirmed that the only hosted Supabase project is `recommendly-dev` (`zpjsmuuxgcewmymmdddr`) and that it is the production project; there is no separate production project. The project name is misleading, so always distinguish the local Supabase stack from this hosted production target. Do not point routine development MCP/testing at hosted production.

Do not run production SQL directly. Production schema changes must travel through Git -> reviewed migration -> project-local Supabase CLI, and only after explicit authorization.

Do not deploy Edge Functions or modify production secrets/Vault unless the user explicitly authorizes deployment.

## 7. Testing

For permission-sensitive changes, unit tests alone are insufficient.

Preferred evidence:
1. focused unit/domain tests;
2. API behavior tests;
3. DB/RLS tests;
4. acceptance/security scenarios;
5. typecheck/format/build checks as applicable.

A regression test should reproduce the original defect and remain in the suite.

For authorization changes, include negative cases:
- owner vs non-owner;
- approved vs pending/rejected/revoked/unsubscribed;
- anonymous where relevant;
- cross-user mutations;
- child-table access;
- MCP/API acting as the same authenticated user.

Never change a pgTAP plan count unless the final assertion count has actually been verified.

If a DB test fails, determine whether it is an environment/container failure or a real SQL/test failure before editing tests.

## 8. MCP/API/web

The product MCP is a user-facing authenticated product surface, not an admin API.

MCP must expose only what the authenticated user could do through the normal product/API.

Do not create MCP-only authorization paths or service-role bypasses.

REST, MCP, domain validation, DB authorization, and web UI must stay aligned. When behavior changes, reconcile the affected layers rather than patching only the layer where the symptom appeared.

Avoid broad UI rewrites while fixing backend/security defects.

## 9. Production safety

Production is never part of normal local development. For Recommendly, the sole hosted Supabase project is `recommendly-dev` (`zpjsmuuxgcewmymmdddr`), explicitly confirmed by the owner as production; there is no separate hosted production project. Use local Supabase for routine development and tests.

Never:
- manually mutate production database state;
- weaken production RLS directly;
- deploy a function;
- deploy Vercel;
- alter production secrets/Vault;
- run remote SQL;

unless the user explicitly authorizes that specific production action.

When production deployment is authorized, use the repository's committed Git/migration workflow. Do not use a management API as a shortcut around Git.

## 10. Known lessons

This project has previously lost time through:
- trying to fix RLS by weakening policies;
- treating child-table privacy as an afterthought;
- direct notification inserts that violated correct cross-user RLS;
- push-dispatch errors aborting otherwise valid notification transactions;
- editing SQL repeatedly with fragile PowerShell replacements;
- attempting to bypass Git for production migrations;
- confusing agent environment failures with project failures;
- stale task files causing completed work to be revisited;
- broad file rewrites producing unintended diffs.

Avoid repeating these patterns.

## 11. Completion report

Every substantial task should finish with:

- Changed: files/behavior changed.
- Reason: defect or requirement addressed.
- Validated: exact checks/tests and results.
- Security: authorization/RLS/service-role implications.
- Deployment: whether anything remote/production was changed.
- Remaining: only concrete known follow-ups.

Never claim a test, deployment, migration, or verification happened unless it actually happened.
