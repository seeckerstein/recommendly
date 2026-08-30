## Checkpoint 5.4B — Fix Notifications + Fuzzy Search

The latest read-only diagnosis identified two concrete bugs in Checkpoint 5.4 and one related reliability problem.

Do NOT redesign anything.
Do NOT touch MCP/OAuth.
Do NOT change the subscription state model.
Do NOT weaken RLS.
Do NOT add usernames/handles.

### BUG 1 — Notification INSERT privilege

Root cause:

The notifications table has an INSERT RLS policy, but the authenticated role was never granted table-level INSERT privilege.

Existing:
- RLS INSERT policy exists
- authenticated has SELECT/UPDATE
- authenticated lacks INSERT

Smallest safe fix:

Create a migration containing:

GRANT INSERT ON public.notifications TO authenticated;

Do not change existing SELECT/UPDATE policies.

Verify the privilege is actually applied on hosted-dev.

### BUG 2 — Fuzzy search wildcard syntax

Current API uses:

.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`)

This is not producing partial matches in the deployed PostgREST environment.

Change the filter to the correct PostgREST wildcard syntax:

.or(`email.ilike.*${q}*,display_name.ilike.*${q}*`)

BUT before implementing, handle search input safely.

Do not allow user input to break the PostgREST filter expression.

Inspect the current query/filter syntax and safely normalize or escape any special characters required by PostgREST.

Preserve:
- case-insensitive matching
- whitespace trimming
- exact email matching
- partial email matching
- display-name matching
- sensible result limit

### BUG 3 — Do not silently swallow notification failures

The API currently logs notification insert errors but still returns subscription success.

That is misleading.

Change the behavior so that:
- subscription state transition behavior remains correct
- notification failure is not silently ignored
- the API returns a safe, useful response consistent with the actual operation

Do NOT accidentally roll back a successful subscription transition unless the existing transaction/function architecture makes that atomic.

Prefer a transaction/DB-function approach only if already supported cleanly.

If the operation cannot be made atomic without expanding scope, report the exact consistency behavior and use the smallest safe approach.

Do not expose internal database errors to the end user.

### REQUIRED TESTING

Add regression tests proving:

NOTIFICATIONS
1. authenticated role has INSERT privilege after migration
2. User A can trigger an appropriate notification for User B
3. User B can see their own notification
4. User A cannot see User B's notification
5. User A cannot modify User B's notification
6. approval/rejection/revocation notifications are created correctly
7. notification insertion failure is not silently reported as full success

SEARCH
8. exact email search
9. partial email search
10. display-name search
11. first/last-name substring search where supported
12. case-insensitive search
13. trimmed whitespace
14. duplicate display names show distinguishing email
15. result limit is enforced behaviorally
16. special search characters cannot break the PostgREST query

### REQUIRED TWO-USER E2E

Use two disposable test users.

User A = requester
User B = recipient/publisher

1. B has at least one recommendation.
2. A finds B using:
   - partial email
   - display name
3. Before subscription:
   - A cannot see B's protected recommendation.
4. A requests access.
5. Verify:
   - subscription becomes PENDING
   - notification row is created for B
6. B logs in / refreshes.
7. Verify B has a visible unread/pending indication in the application.
8. B opens the request.
9. B approves.
10. Verify:
    - relationship becomes APPROVED/Connected
    - B's approval notification behavior is correct
    - A receives the approval notification
11. A can now see B's permitted recommendation.
12. A cannot edit/delete B's recommendation.
13. B revokes access.
14. Verify:
    - relationship becomes REVOKED/removed
    - A receives revocation notification
    - A can no longer see B's protected recommendation.
15. Test Decline with a separate pending request.

### IMPORTANT — ACTUAL USER EXPERIENCE

Do not mark the notification portion passed merely because the database row exists.

Verify:
- unread badge/count appears
- pending request is obvious
- requester is identified
- Approve/Decline are obvious
- notification survives reload
- notification survives logout/login

### PRODUCTION / HOSTED-DEV

Do not deploy yet.

First:
- implement locally
- run tests
- run TypeScript
- run production build
- inspect diff
- verify migration content
- verify no MCP/OAuth changes

Because the Codex sandbox has previously experienced outbound EACCES errors, do not repeatedly run ad-hoc Node scripts against hosted Supabase if network access is unavailable.

### Deployment

Once local validation is green:

local
→ commit
→ push
→ Vercel Preview
→ hosted-dev verification
→ Vercel Production

Do NOT deploy dirty working-tree code.

Do NOT modify production Supabase.

### Final report

Report:

1. exact migration
2. exact API search change
3. notification error-handling change
4. tests
5. two-user E2E
6. privacy/security findings
7. Git commit SHA
8. Vercel Preview/Production IDs
9. hosted-dev API version
10. final synchronization status

STOP before production promotion if any required E2E/security test fails.