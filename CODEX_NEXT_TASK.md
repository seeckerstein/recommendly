We are continuing the subscription access/notification bugfix on branch:

fix-subscription-notifications

IMPORTANT: Before doing anything else, confirm that:
- supabase/tests/push_subscriptions.sql
- supabase/tests/permission_matrix.sql

are restored to their HEAD/original versions after the previous failed editing attempts.

Do NOT start by editing either SQL test file.
Do NOT use repeated PowerShell string replacements to manipulate SQL.
Do NOT weaken RLS.
Do NOT patch production.
Do NOT commit until the implementation and tests are reviewed and passing.

==================================================
1. PRODUCTION BUG TO FIX
==================================================

There is a real production bug in the subscription request flow.

Observed production case:

Requester:
johan.eckerstein@vitalaize.com

Target/publisher:
johan.eckerstein@gmail.com

The subscription request was successfully created, but:

- the target/publisher did not receive an Activity notification;
- no push notification was generated;
- the requester did not see the outgoing pending request in their list.

Production subscription exists with:
- status = PENDING
- subscriber_id = requester
- publisher_id = target
- no corresponding notification row.

Current API behavior creates the subscription and then attempts to insert a notification using the normal authenticated client.

Current notification INSERT RLS requires:

actor_user_id = auth.uid()

Therefore a normal authenticated client cannot create a notification addressed to another user. This is expected RLS behavior and must NOT be fixed by weakening the policy.

The correct design is:

- user-facing authorization remains normal authenticated/RLS-based;
- after the subscription operation has been authorized and successfully performed, trusted server-side code may create the corresponding notification using narrowly scoped elevated/server-side access;
- recipient and actor must be derived from the trusted subscription operation, NOT blindly accepted from client input;
- do not turn service-role access into a general authorization bypass.

Fix all relevant subscription lifecycle notifications:

- subscription_request
- subscription_approved
- subscription_rejected
- access_revoked

Preserve the existing email behavior.
Preserve the push notification architecture.
The notifications table remains the source of truth; push/email are delivery channels.

The notification must reference the exact directional subscription that changed.

==================================================
2. CRITICAL BUSINESS RULE:
   ACCESS IS DIRECTIONAL
==================================================

Subscription/access approval is directional.

If User A requests access to User B:

A -> B = PENDING

If B approves that request:

A -> B = APPROVED

This means:

- A gets the access represented by A -> B.
- B does NOT automatically get access to A.
- Do NOT automatically create or approve B -> A.
- Approval of one direction must never silently approve the reverse direction.

For B to get access to A:

B must separately request:

B -> A = PENDING

and A must separately approve it:

B -> A = APPROVED

Only when both independent directional relationships are APPROVED should the relationship be considered mutually approved / fully reciprocal:

A -> B = APPROVED
B -> A = APPROVED

The two directions must remain independent in the database, API, notifications, and UI.

Use the existing terminology/fields such as:
- subscriber_id
- publisher_id
- pending_in
- pending_out

consistently with this directional model.

Do NOT introduce a generic "friendship" state that hides the two directional subscriptions.

==================================================
3. REQUIRED BEHAVIOR
==================================================

Verify and, where necessary, correct the complete lifecycle:

A requests B:
- A -> B is PENDING
- B sees an incoming request
- A sees an outgoing/pending request
- B -> A remains absent/not approved

B approves:
- A -> B becomes APPROVED
- notification is created for A
- B -> A remains absent/not approved
- B does NOT suddenly gain access to A

B rejects:
- A -> B becomes REJECTED according to the existing model
- notification goes to A
- B -> A remains independent

B revokes A's approved access:
- A -> B becomes revoked/revoked-equivalent according to existing model
- notification goes to A
- B -> A is NOT silently changed

Then B can independently request A:
- B -> A becomes PENDING
- A sees the incoming request
- B sees the outgoing request

A approves:
- B -> A becomes APPROVED
- notification goes to B
- now both directions are approved
- reciprocal access is now valid

Do not change existing intended semantics beyond what is required to enforce this clearly.

==================================================
4. INVESTIGATE THE OUTGOING REQUEST BUG
==================================================

The production user also reported that the requester could not see their outgoing pending request.

Inspect the existing API and web UI carefully.

There is existing subscription GET support for:
- following
- subscribers
- pending_in
- pending_out

and the frontend has subscription retrieval code.

Determine why the actual requester does not see the PENDING outgoing request.

Fix the real cause rather than adding a duplicate/parallel mechanism.

Verify that:
- pending_in shows requests where the current user is publisher/target;
- pending_out shows requests where the current user is subscriber/requester;
- approved access is displayed in the correct direction;
- rejected/revoked states behave according to the existing product model.

==================================================
5. NOTIFICATION SECURITY
==================================================

Do NOT weaken the existing notification INSERT RLS policy merely to make the tests pass.

Do NOT allow arbitrary authenticated users to insert notifications for other users.

Implement a narrowly scoped trusted/server-side notification creation path if required.

The trusted notification creation must:
- derive recipient from the authorized subscription operation;
- derive actor from the authenticated user / trusted operation;
- use the exact subscription ID as reference_id;
- use reference_type = subscription;
- use the correct notification type;
- not accept arbitrary recipient/actor values from the client as an authorization mechanism.

Check all four lifecycle operations for actor/recipient correctness.

==================================================
6. TESTS
==================================================

First inspect the existing tests and their current baseline.

Do not blindly rewrite SQL tests.

Add or modify the minimum tests necessary to prove the real behavior.

Required regression coverage:

A. Notification request
- A requests B
- subscription is created
- notification exists for B
- notification actor is A
- notification references the exact subscription
- push/email behavior remains independent

B. Approval
- B approves A
- A -> B becomes APPROVED
- notification exists for A
- actor/recipient/reference are correct
- B -> A is NOT automatically created/approved

C. Rejection
- correct directional subscription changes
- notification goes to requester
- reverse direction is unchanged

D. Revocation
- correct directional subscription changes
- notification goes to the affected user
- reverse direction is unchanged

E. Reciprocal approval
- A -> B approved
- B -> A does not exist/approve automatically
- B separately requests A
- B -> A pending
- A approves
- both directions are now approved

F. Pending lists
- pending_in returns the correct incoming request
- pending_out returns the correct outgoing request

G. RLS/security
- ordinary authenticated users still cannot arbitrarily create notifications addressed to another user
- the trusted server-side path can create the legitimate notification
- do not turn this into a broad notification INSERT permission

If an existing pgTAP test intentionally expects a cross-user notification INSERT to fail, preserve that security assertion. Use the appropriate pgTAP assertion mechanism so the expected failure does not abort the entire test file.

==================================================
7. TEST EDITING RULE
==================================================

The previous attempt became unstable because SQL files were repeatedly manipulated through PowerShell string replacements.

Do NOT repeat that workflow.

If an SQL test needs modification:

1. restore/verify the original file;
2. make one deterministic, minimal edit;
3. inspect the entire resulting diff;
4. verify SQL syntax/structure;
5. run the targeted DB test;
6. only then proceed.

If an edit attempt fails or produces unexpected structure:
- STOP;
- restore the file from Git;
- use a different deterministic editing approach.

Do not stack transformations on top of a malformed file.

Do not modify `plan(N)` unless the final number of assertions has actually been counted.

==================================================
8. TEST EXECUTION
==================================================

Run the appropriate tests after implementation.

At minimum:

- targeted unit tests
- DB tests
- web TypeScript/typecheck if applicable
- formatting checks

Use the project-local Supabase CLI / pnpm workflow.

Do not require a globally installed Supabase CLI.

If `supabase test db` fails with only:

"error running container: exit 1"

do NOT immediately modify SQL.

First determine whether the failure is:
- Docker/container/environment failure
or
- actual SQL/pgTAP failure.

Capture the underlying debug/error output.

Classify failures as:
1. environment/tooling failure
2. known pre-existing baseline failure
3. regression introduced by this branch

Do not hide or redefine baseline failures as successes.

==================================================
9. PRODUCTION SAFETY
==================================================

This branch must not deploy or modify production.

Do NOT:
- manually change production database state;
- change production RLS directly;
- deploy Edge Functions;
- deploy Vercel;
- alter production secrets;
- alter production Vault values.

Only prepare code/migrations/tests in Git.

Production deployment happens separately after review.

==================================================
10. GIT WORKFLOW
==================================================

Respect the repository Git workflow.

Before changes:
- inspect git status;
- remain on fix-subscription-notifications;
- do not switch branches;
- do not stash unless absolutely necessary.

During work:
- make coherent changes;
- inspect `git diff`;
- inspect `git diff --check`;
- run tests.

Before committing:
- confirm only intended files changed;
- confirm no generated/temp files;
- confirm no secrets;
- confirm tests/results.

Then create a normal Git commit on this branch.

Push the branch to origin.

Do NOT merge into main.
Do NOT deploy production.

==================================================
11. FINAL REPORT
==================================================

At the end report:

1. Root cause of the notification bug.
2. How trusted notification creation was implemented.
3. How outgoing pending requests were fixed.
4. Confirmation that access remains directional.
5. Confirmation that one approval does NOT automatically approve the reverse direction.
6. Confirmation that reciprocal access requires two independent approvals.
7. Tests added/changed.
8. Exact test results.
9. Any pre-existing failures separately identified.
10. Commit hash.
11. Branch pushed.
12. Explicit confirmation that production was NOT modified/deployed.

If any requirement is ambiguous, STOP and explain the ambiguity rather than inventing behavior.