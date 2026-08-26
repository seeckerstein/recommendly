# Engineering rules

Read `docs/PRD.md` and `docs/CODEX_BUILD_SPEC.md` before changing architecture.

- Supabase Postgres, Auth, RLS, migrations, and Edge Functions are the backend foundation. Do not add a custom server without a concrete requirement.
- A migration is the source of truth for every schema change; do not make dashboard-only schema changes.
- RLS is mandatory. User-facing flows must never use a service-role client as an authorization shortcut.
- REST and future MCP tools must call the same domain services and enforce the same permissions.
- Recommendation creation requires only `category` and a free-text `comment`; metadata is optional.
- Re-recommendations are independent records, with no V1 source foreign key.
- Every permission-sensitive change needs positive and negative database tests, including child-table leakage tests.
- Keep development/staging tooling and credentials separate from production. Never commit secrets.
- Do not start mobile UI work until `docs/ACCEPTANCE_GATE.md` passes.
