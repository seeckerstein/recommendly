# Agent Instructions — Recommendly / YOU'D LIKE

This file is the working contract for coding agents in this repository.

The repository is a private-by-default recommendation network. The core engineering rule is simple:
**authorization is a product feature and the database is part of the application, not an implementation detail.**

When instructions conflict, use this precedence:

1. The user's current request and explicit constraints.
2. The current repository state, tests, migrations, and generated artifacts.
3. This `AGENTS.md`.
4. Product/architecture/security docs under `docs/`.
5. Historical handoff/checkpoint notes.

Historical notes are context, not truth. Verify them against the current tree before acting.

---

## 1. Read this first

Before changing architecture, database behavior, authorization, or MCP behavior, read:

- `README.md`
- `docs/PRD.md`
- `docs/CODEX_BUILD_SPEC.md`
- `docs/SECURITY.md`
- `docs/ACCEPTANCE_GATE.md`
- `CODEX_HANDOFF.md` when historical context is useful
- `CODEX_NEXT_TASK.md` only as a historical/task-context document; it may contain stale or contradictory checkpoint text

Then inspect the current Git diff/status, migrations, tests, and the code that actually executes the behavior you are changing.

Do not assume a prior checkpoint, handoff, OpenAPI document, or README is more current than executable code and migrations.

---

## 2. Repository shape

The project is a pnpm workspace:

```text
apps/
  web/                         # Next.js web client
packages/
  domain/                      # shared domain rules/types/validation
supabase/
  migrations/                  # canonical Postgres schema + RLS + DB functions
  functions/
    api/                       # authenticated REST/domain entry point
    mcp/                       # customer-facing product MCP endpoint
  tests/                       # pgTAP / permission / privacy tests
docs/
  PRD.md
  CODEX_BUILD_SPEC.md
  SECURITY.md
  ACCEPTANCE_GATE.md
  openapi.yaml
README.md
AGENTS.md
package.json
pnpm-workspace.yaml
```

The exact tree may evolve. Inspect it rather than creating parallel structures merely because a historical handoff described them.

### Architectural center

The intended architecture remains:

- Supabase Postgres
- Supabase Auth
- PostgreSQL RLS
- Supabase Edge Functions / TypeScript
- committed SQL migrations
- shared domain contracts and validation
- one authorization model shared by web, mobile, REST, MCP, and future clients

Do not introduce a second backend or separate authorization system without a concrete requirement.

The customer-facing product MCP and Supabase's development/engineering MCP are different things:

- **Supabase MCP** is developer tooling.
- **Product MCP** is a user-facing integration and must act as the authenticated user under the same authorization model as the app/API.

Development MCP tooling must never be connected to production.

---

## 3. Core invariants — do not weaken these

### Privacy / authorization

- The product is private by default.
- A private recommendation is readable by its owner or an approved subscriber, unless the owner's profile is public under the product rules.
- Pending, rejected, revoked, and unsubscribed relationships do not grant access.
- Anonymous users do not gain access to private recommendations.
- Public-profile visibility and subscription approval are distinct concepts.
- Child records (comments, ratings, notifications, and future child tables) must not leak data about an inaccessible parent.
- Only the recommendation owner may modify/delete their recommendation.
- Only a viewer authorized to read a recommendation may comment or rate it.
- LLM/MCP clients never bypass normal user authorization.

### Database security

- RLS is mandatory on user-facing tables.
- RLS policy logic is part of the product contract and must be tested.
- A user-facing flow must not use a service-role client as an authorization shortcut.
- `SECURITY DEFINER` functions are allowed only when they are intentionally scoped, use a safe `search_path`, and enforce the caller's identity/permissions themselves.
- If privileged server-side access is genuinely required for an operational task (for example, a narrowly scoped email send or account-deletion operation), isolate it from authorization decisions and do not let it become a general bypass.

### Schema

- SQL migrations are the source of truth for schema changes.
- Never make dashboard-only schema changes and leave Git behind.
- Never rewrite old migrations simply to make the current state look cleaner; add a corrective migration when appropriate.
- Prefer idempotent migrations where the existing schema conventions call for them.

---

## 4. The most important lessons learned from this project

These are not abstract best practices; they are recurring failure modes already encountered here.

### 4.1 RLS policy != complete database permission

An RLS policy can be correct and still fail because the role does not have the underlying table privilege.

Example already encountered: notifications had an INSERT policy, but the authenticated role also needed an explicit `GRANT INSERT`.

**Rule:** whenever adding RLS-protected writes, test both:

- the policy's `WITH CHECK` / `USING` behavior, and
- the relevant table/function privilege.

A pgtap test should make the expected privilege explicit when the behavior depends on it.

### 4.2 Test parent privacy and child-table privacy separately

A user being unable to read `recommendations` is not enough. A join or direct query against `comments` or `recommendation_ratings` must not reveal rows belonging to a hidden recommendation.

**Rule:** every permission-sensitive parent resource needs negative tests for its child tables.

### 4.3 Fresh auth users need deterministic application rows

Supabase Auth users and application `profiles` are separate concerns. A new Auth user can otherwise exist without the application-level row expected by foreign keys and business logic.

The repository solved this with signup-time profile provisioning plus an idempotent backfill for pre-existing users.

**Rule:** when adding a new required application row derived from `auth.users`, handle both:

- new-user provisioning, and
- already-existing users.

Make the backfill safe to run more than once.

### 4.4 JWT identity must come from verified claims

Do not trust a decoded token or a client-supplied user ID as identity.

The current Edge Function pattern verifies the bearer token with Supabase `auth.getClaims(...)` and derives the caller from the verified `sub` claim.

The product MCP validates the bearer token at its HTTP boundary and the API path repeats authentication validation for defense in depth.

**Rule:** identify the caller from the verified token; never accept `user_id` from request JSON as the source of truth for ownership.

### 4.5 Authorization belongs below the transport layer

REST and MCP should not invent their own versions of permissions.

The canonical model is:

```text
client (web/mobile/MCP)
        -> authenticated API/domain operation
        -> caller-scoped Supabase client / DB function
        -> RLS + explicit domain authorization
        -> Postgres
```

**Rule:** if REST says one thing and MCP says another, fix the shared domain/authorization path rather than teaching each client a different rule.

### 4.6 Re-recommendation is a new record

A re-recommendation is intentionally an independent recommendation owned by the new recommender. V1 does not use a source foreign key.

**Rule:** do not add implicit inheritance or a relational shortcut unless the product model explicitly changes.

### 4.7 Workflows should be idempotent where users can repeat actions

Subscription transitions were made tolerant of duplicate approvals/rejections because retries and repeated UI actions are normal.

**Rule:** when an operation can be retried by the UI, network, webhook, or agent, decide explicitly whether it should be:

- idempotent success/no-op,
- conflict, or
- a true error.

Document and test that behavior.

### 4.8 Notifications are not guaranteed to point to a live object

A notification can outlive the subscription/reference it names, and repeated requests can reuse the same subscription record.

**Rule:** notification rendering and API code must tolerate nullable/missing/deleted references. Never assume every notification can resolve to a live parent row.

### 4.9 PostgREST filters have their own syntax

People-search and fuzzy-search work caused bugs because raw user input was placed into PostgREST filter expressions.

**Rule:** escape PostgREST filter metacharacters before constructing `.or(...)`, FTS, `ilike`, or similar filter strings. Treat query syntax as an injection surface even when the eventual database query is parameterized at a lower level.

### 4.10 Cross-user mutation checks are mandatory

A delete/update endpoint can be functionally correct for the owner and still allow a cross-user action if ownership is not enforced in the DB/predicate.

The project previously needed a specific fix for cross-user recommendation DELETE authorization.

**Rule:** every mutation must constrain ownership/authorization in the database operation itself, not only in prior application logic.

For example, prefer:

```ts
.from("recommendations")
.delete()
.eq("id", recommendationId)
.eq("user_id", authUserId)
```

and still rely on RLS as the final boundary.

### 4.11 Keep auth/profile data in the application schema, not direct `auth.users` reads from clients

Email-based discovery was added by syncing email into `profiles`, rather than exposing `auth.users` to product queries.

**Rule:** use an intentional application-facing projection for data needed by product features. Do not make client code depend directly on Auth internals.

### 4.12 Contracts can go stale

The repository has had periods where OpenAPI, checkpoint notes, and implementation were temporarily out of sync. For example, category support expanded beyond the original book/movie/restaurant set, and recommendation creation semantics evolved.

**Rule:** when behavior changes, reconcile all layers:

- DB schema/constraints
- migrations
- domain validation
- Edge Function/API behavior
- MCP tool behavior
- web UI
- tests
- OpenAPI/docs

Do not fix only the layer that surfaced the symptom.

### 4.13 Category behavior is table-driven, not a pile of enums

Current domain categories include `book`, `movie`, `restaurant`, `series`, and `other`. The database owns category rows and associated metadata schemas.

**Rule:** resolve active categories from the `categories` table consistently and keep domain/API/MCP/UI/OpenAPI expectations synchronized when new categories are added.

### 4.14 Do not confuse "service role is forbidden" with "service role can never exist"

The product security rule forbids using service-role access to bypass normal user authorization.

It does not prohibit narrowly scoped backend operations that inherently require elevated privileges (for example, account deletion or a server-side email dispatch).

**Rule:** every service-role use should be:

- server-side only,
- narrowly scoped,
- isolated from read/write authorization decisions,
- impossible for the client to invoke as an arbitrary privileged query.

### 4.15 Avoid infrastructure churn

The project deliberately uses Supabase + Edge Functions instead of a custom Node/Nest backend.

**Rule:** do not add infrastructure because it feels cleaner. Add it only when an observed requirement cannot be solved within the existing architecture without disproportionate complexity.

---

## 5. Current product/domain rules

V1/product behavior currently includes:

- accounts and profiles
- public/private profile visibility
- subscription request, approve, reject, revoke, and unsubscribe
- recommendations
- ratings
- comments
- tags and metadata
- feed/discovery/search
- notifications
- public API
- product MCP

Recommendation categories currently represented in the shared domain are:

- `book`
- `movie`
- `restaurant`
- `series`
- `other`

Recommendation creation currently requires an active category and at least one of a meaningful `title` or `comment`. Do not reintroduce a stale "comment is always required" rule merely because an older spec/OpenAPI snapshot says so.

Metadata is optional and should remain extensible by category.

---

## 6. Coding / implementation guidance

### TypeScript

- Keep strict TypeScript enabled.
- Reuse shared domain contracts instead of duplicating validation in clients.
- Prefer small typed helpers over scattered stringly-typed behavior.
- Do not hide type errors with `any`, unsafe casts, or broad suppression when the underlying contract can be fixed.
- When a generated/database type changes, update the dependent domain/API/UI layers deliberately.

### Edge Functions

- Authenticate at the boundary.
- Derive the caller from verified claims.
- Use caller-scoped Supabase clients for normal user operations.
- Return stable, intentional status codes for auth/validation/not-found/conflict cases.
- Keep domain behavior centralized enough that REST and MCP cannot drift apart.
- Treat CORS and preflight handling as part of the public API contract.
- Escape user-controlled filter expressions before constructing PostgREST filters.

### Database functions

Use `SECURITY DEFINER` only when needed.

When using it:

- set a safe `search_path`, usually `public` plus explicitly required schemas;
- validate `auth.uid()` / caller identity inside the function;
- validate the target row and allowed state transitions;
- keep the function narrow and deterministic;
- add positive and negative tests for the privilege boundary.

For state transitions, use row locking where concurrent updates could otherwise race.

### Migrations

Name migrations with the repository's established timestamp/sequence convention.

Before writing a migration:

1. inspect the existing table, constraints, indexes, functions, grants, and policies;
2. determine whether the desired state is already partially present;
3. make the migration safe for the actual starting state;
4. add/update tests for both the intended behavior and the failure mode that motivated the migration.

After writing it:

- run local database reset/migration application;
- run database tests;
- inspect the migration diff;
- verify no unrelated schema changes were introduced.

Never use the dashboard as the authoritative place to make a schema fix.

### Search

Treat user search input as data, not query syntax.

For PostgREST filters:

- escape special filter characters;
- do not concatenate raw user input into expressions blindly;
- test punctuation and wildcard-looking input;
- preserve authorization while searching.

Search results must never broaden visibility beyond what the caller could read directly.

---

## 7. MCP-specific rules

The product MCP is an authenticated product surface, not a privileged admin API.

Each tool must answer the question:

> What could this exact user do through the normal app/API?

Then expose no more than that capability.

Important current semantics:

- `get_my_recommendations` is own-only.
- `get_connected_recommendations` is for recommendations the caller is authorized to see from other users.
- The connected scope must exclude the authenticated user at the API level when the product semantics require "other people".
- Owner identity fields such as `owner_id`, `owner_name`, and `owner_email` must not be dropped accidentally when mapping connected recommendations.
- Recommendation `title` is top-level; category-specific information belongs in `metadata`.

When changing MCP behavior:

1. update product/domain/API semantics first;
2. update MCP mapping/tool schemas second;
3. test both authorized and unauthorized cases;
4. verify OAuth/token validation still matches the normal user identity.

Do not add an MCP-only bypass, privileged search scope, or hidden service-role path.

---

## 8. Web UI guidance

The Next.js web client is a client of the API/domain model, not a second source of business truth.

When changing UI flows:

- use shared domain validation where practical;
- use authenticated Supabase clients correctly for browser/server contexts;
- do not put service-role credentials in browser code;
- preserve the authorization boundary when preloading/profile/searching data;
- keep mobile/desktop navigation concerns separate from backend rules.

When adding a new category or recommendation field, update the picker/form, display mapping, domain contract, API, MCP, tests, and documentation together.

Avoid large UI rewrites while fixing backend authorization bugs unless the UI is part of the defect.

---

## 9. Local development

The repository uses pnpm and a local Supabase/Docker workflow.

Known root scripts include:

```text
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:db
pnpm supabase:start
pnpm supabase:stop
```

Typical backend verification flow:

```powershell
pnpm install
pnpm supabase:start
pnpm exec supabase db reset
pnpm test:db
pnpm test
pnpm typecheck
pnpm format:check
pnpm supabase:stop
```

Do not blindly run commands that mutate a remote project.

Always label a potentially stateful action as one of:

- **local only**
- **development/staging**
- **production**

Production is not part of normal development work here.

### Supabase CLI

Use the project-local CLI when necessary rather than assuming a global binary exists.

On Windows/PowerShell, `.cmd` wrappers may work when `.ps1` execution is blocked. Do not change system execution policy just to work around a wrapper unless there is a genuine need.

Do not run `supabase init` in an already initialized repository.

### Environment / secrets

- Copy `.env.example` to a local env file as needed.
- Never commit real secrets.
- Never paste tokens, service-role keys, access tokens, or passwords into chat or code.
- Keep development/staging credentials separate from production.
- Revoke temporary CLI/access tokens when they are no longer needed.
- Treat `.env`, Supabase local state, build output, caches, and generated credentials as untracked local artifacts.

---

## 10. Testing standard

For permission-sensitive work, passing unit tests alone is insufficient.

The preferred evidence stack is:

1. unit/domain tests
2. API behavior tests
3. database/RLS integration tests
4. acceptance-gate scenarios
5. build/type/format checks

### Minimum authorization matrix

For a private recommendation, explicitly verify:

| Actor / relationship | Expected |
|---|---|
| owner | allow |
| approved subscriber | allow |
| public profile / authenticated viewer | allow when public-profile rule applies |
| pending subscriber | deny |
| rejected subscriber | deny |
| revoked subscriber | deny |
| unsubscribed | deny |
| anonymous | deny |
| LLM/MCP acting as approved user | same as approved user |
| LLM/MCP acting as unapproved user | same as unapproved user |

Also test child-table isolation for comments and ratings.

### Regression tests should reproduce the bug

When fixing a defect:

- first write or identify the smallest test that reproduces the defect;
- fix the root cause;
- keep the regression test permanently unless the behavior intentionally changes;
- add the corresponding negative case when the defect involved authorization or data leakage.

Do not delete a failing test merely because a new implementation makes it inconvenient.

---

## 11. Acceptance gates and sequencing

Do not move to a new application layer merely because the current layer is "mostly working."

For backend/security work, the acceptance gate in `docs/ACCEPTANCE_GATE.md` is the checkpoint.

At minimum, verify:

- private recommendation isolation;
- approved access;
- revocation removing access immediately;
- public-profile behavior;
- comments/ratings following the same visibility boundary;
- re-recommendation as an independent record;
- API/domain tests;
- RLS/privacy tests;
- search respecting authorization;
- LLM/MCP behaving as the same user identity.

Only then expand into the next application layer when the product plan requires it.

---

## 12. Agent anti-stall / recovery rules

This project has previously lost time when an agent became stuck around its editing/tooling workflow. Avoid repeating that pattern.

### Do not depend on a "patch" workflow

Do **not** assume an `apply_patch`, patch-file, or patch-oriented editing mechanism exists or is reliable in the current agent environment.

When a patch mechanism is unavailable, failing, or repeatedly producing no usable result:

- stop retrying the same patch operation;
- edit the target file directly using the available repository/file-write mechanism;
- make the smallest complete file change needed;
- re-read the file and inspect the diff immediately afterward;
- do not create patch/temp files merely to work around the missing mechanism.

A failed editing tool is an implementation detail, not a reason to keep the task blocked.

### Use bounded investigation

When a command, UI, integration, or tool fails repeatedly:

1. capture the actual error/evidence;
2. try the most plausible alternative once or twice;
3. if the same approach continues to fail, change strategy;
4. document the blocker and continue with whatever can be verified safely.

Do not loop indefinitely on one command, one dashboard page, one API call, or one tool.

### Separate diagnosis from implementation

Do not keep changing code while still trying to determine what the problem is.

Use this sequence:

```text
reproduce -> identify root cause -> make smallest change -> validate -> report
```

If the task is explicitly read-only, do not cross the boundary into editing just because a defect is discovered.

### Prefer a stopping condition

Every investigation should have a concrete completion condition, such as:

- the suspected bug is reproduced;
- the root cause is identified;
- the relevant tests pass;
- the requested files were inspected;
- the current state is safe to commit;
- or the environment is proven to be the blocker.

Once that condition is met, stop expanding the investigation unless the user requested more.

### Do not confuse tool failure with product failure

A broken local command, unavailable CLI wrapper, dashboard issue, or agent-tool limitation does not by itself justify architectural changes.

First find the narrowest workaround. Preserve the application architecture unless the product requirement actually changed.

### When blocked, report instead of spinning

If progress is blocked by missing credentials, unavailable software, broken external tooling, or an unsafe remote-state ambiguity:

- say what was verified;
- say exactly what is blocked;
- say what safe next action is required;
- do not burn the remaining task by repeatedly attempting the same blocked path.

## 12. Change workflow for agents

Before editing:

1. inspect `git status`;
2. inspect the relevant current files and migrations;
3. identify the actual authorization boundary;
4. find existing tests for the behavior;
5. find historical fixes/checkpoints related to the area;
6. decide the smallest change that preserves architecture.

During editing:

- keep changes narrowly scoped;
- avoid mixing refactors with bug fixes;
- do not create temporary files in the repository;
- do not silently change product semantics while fixing an implementation defect;
- update tests with behavior changes;
- update docs/contracts when public behavior changes.

After editing:

1. inspect the full diff;
2. run the most targeted tests;
3. run the relevant database/RLS tests for backend/auth changes;
4. run typecheck/build/format as appropriate;
5. verify no secrets or generated artifacts were added;
6. verify the working tree contains only intentional changes;
7. summarize what changed, why, validation evidence, and any remaining uncertainty.

For destructive or remote operations, state the environment and exact effect before running them.

---

## 13. Git / checkpoint discipline

**Git is the source-of-truth workflow for application changes. Do not bypass it.**

The normal flow is:

```text
inspect working tree
    -> create/use the correct feature branch
    -> edit files
    -> inspect diff
    -> run relevant test/validation scripts
    -> fix failures
    -> inspect diff again
    -> commit one coherent change
    -> push the branch when requested
    -> deploy through the repository's normal deployment workflow when requested
```

### Git rules

- Never bypass Git by making undocumented changes directly in a remote environment.
- Do not treat a GitHub file-edit/API operation as a replacement for the repository's normal local Git workflow.
- Work on an appropriate branch. Do not make feature work directly on `main` unless the user explicitly instructs it.
- Check `git status` before editing and before committing.
- Check the diff before and after validation.
- Keep commits small and logically coherent.
- Do not mix unrelated cleanup/refactors into a feature or bug-fix commit.
- Do not create a commit merely to make the tree "look clean"; the commit must represent a real checkpoint.
- Run the repository's relevant test scripts before committing code changes.
- For database/auth/security changes, run the database/RLS tests as well as the relevant unit/type/build checks.
- Do not use `--no-verify` to bypass hooks unless the user explicitly authorizes it and there is a documented reason.
- Do not force-push, reset away work, amend published commits, or rewrite history unless explicitly requested.
- Do not discard user changes because they complicate the task. Inspect and preserve them.
- Never claim a commit, push, test, or deploy happened unless it actually happened.

### Commit gate

A code change is not ready to commit until:

1. the working tree contains only intentional changes;
2. the relevant test/validation scripts have been run;
3. failures are resolved or explicitly reported;
4. `git diff --check` is clean;
5. the final diff matches the requested scope.

For a checkpoint, report the commit hash and the tests/checks actually run.

### Push gate

Pushing is a separate action from committing.

- Commit locally first.
- Verify the commit and branch.
- Push only when the user asks for a push or the task explicitly requires publishing the branch.
- Never silently push to `main`.
- Never silently force-push.
- After pushing, verify the remote branch/commit if the workflow requires it.

### Deploy gate

Deployment is separate from editing and separate from committing.

- Do not deploy merely because code compiles.
- Do not deploy before the relevant tests and acceptance checks pass.
- Do not make ad-hoc production changes to "fix" a failed deployment.
- Prefer deploying the exact Git commit that was validated.
- If deployment is not requested, stop after validation/commit as appropriate.

### Supabase: migrations are the only normal path for schema changes

**Never change the Supabase schema directly in the dashboard, SQL editor, or another remote-only mechanism and then leave Git unaware of the change.**

The required flow for schema/database behavior changes is:

```text
edit SQL migration in repository
    -> review migration
    -> run local Supabase reset/tests
    -> commit migration
    -> push when requested
    -> deploy migration to the intended Supabase environment with the Supabase CLI
    -> verify remote migration/state
```

Rules:

- Every schema change must exist as a committed migration.
- Do not use the Supabase dashboard as the source of truth for schema changes.
- Do not make a remote SQL change first and "backfill" a migration later unless an emergency recovery explicitly requires it.
- Never point development tooling or migrations at production accidentally.
- Before any remote Supabase command, identify the target project/environment explicitly.
- Use the project-local Supabase CLI when appropriate.
- Run `supabase db reset` / `pnpm test:db` locally for migration changes before remote deployment.
- Treat remote migration deployment as a deployment action, not a substitute for committing the migration.
- After remote deployment, verify the migration/state rather than assuming success.
- If a migration needs correction, add a new migration rather than silently editing an already-applied migration.

### Vercel: repository state is the source of deployed application code

For Vercel and similar deployment platforms, do not bypass the repository by editing application code or configuration only in the hosting dashboard.

Normal flow:

```text
change repository
    -> test/build
    -> commit
    -> push
    -> deploy through the linked Git workflow / approved deployment mechanism
    -> verify deployment
```

Rules:

- Application code must be changed in Git, not only in the Vercel dashboard.
- Prefer the repository-linked Vercel deployment flow for code deployments.
- Do not make manual production code/configuration edits in the Vercel dashboard when the same change belongs in the repository.
- If a Vercel project setting genuinely must be managed remotely (for example, a secret, domain, integration, or platform setting), treat that as infrastructure state and make the change deliberately, document it when appropriate, and do not pretend it is represented by a source-code commit.
- Never casually change production environment variables, domains, deployment settings, or project configuration.
- Verify the target Vercel project/environment before making a remote change.
- When possible, deploy the exact Git commit that passed validation.
- Do not use an ad-hoc direct deployment to hide or bypass a broken Git-based workflow.
- If a deployment fails, diagnose the deployment; do not patch production manually and leave the repository inconsistent.

### Other external systems

The same principle applies to other managed services:

- code/configuration that belongs in the repository must be changed in the repository first;
- remote deployment/synchronization comes after validation and commit;
- direct dashboard edits are exceptions for true platform state, not a parallel development workflow;
- remote state must never silently diverge from the repository's intended state.

---

## 14. Documentation is part of the implementation

When behavior changes, keep the repository's contract documents aligned.

Especially update/check:

- `README.md` for developer-facing setup/usage changes
- `docs/PRD.md` for product semantics
- `docs/CODEX_BUILD_SPEC.md` for architectural decisions
- `docs/SECURITY.md` for security model changes
- `docs/ACCEPTANCE_GATE.md` for new acceptance criteria
- `docs/openapi.yaml` for public API changes
- MCP/tool docs when customer-facing tool semantics change

Avoid copying large historical narratives into multiple docs. Keep one source of truth and link to it from historical notes.

---

## 15. Founder/operator context

The project is intentionally optimized for a founder/operator who should not have to administer unnecessary infrastructure.

When providing commands or instructions:

- prefer small, copy/paste-friendly steps;
- explain whether a command is local, development/staging, or production;
- never ask for secrets in chat;
- avoid avoidable infrastructure work;
- explain irreversible operations before running them;
- favor verification and evidence over confident assumptions.

---

## 16. What a good agent response looks like

A good implementation response should make the evidence easy to audit:

- **Changed:** what files/behavior changed.
- **Reason:** which product/invariant/bug motivated it.
- **Validated:** exact tests/checks run and their outcomes.
- **Security:** any authorization/RLS/service-role implications.
- **Contract alignment:** whether API/domain/MCP/UI/docs were reconciled.
- **Remaining:** only concrete known risks or follow-ups.

Do not claim a test, deployment, or verification happened unless it actually happened.

---

## 17. Final reminder

When in doubt, choose the path that preserves these four properties:

1. **one authorization model** across DB/API/UI/MCP;
2. **the database and migrations are trustworthy sources of truth**;
3. **every permission-sensitive behavior has a negative test**;
4. **the smallest change that fixes the real problem wins**.
