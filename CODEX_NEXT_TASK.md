# CODEX NEXT TASK

Before doing anything else, stop and audit the changes from the last step.

I reviewed the implementation and found several likely issues that need verification.

## 1. Recommendation creation

POST /v1/recommendations validates body.category, but the shown insert does not set category_id.

Verify this against the actual schema. The endpoint must resolve the requested category safely and insert the correct category_id.

Add an API-level test proving that a valid recommendation can actually be created.

## 2. Re-recommendation

POST /v1/recommendations/:id/recommend appears to insert without category_id and comment.

Verify the actual implementation and schema. The endpoint must create a valid, independent recommendation and copy the required content correctly.

Add an API-level test proving that an authorized user can actually re-recommend a recommendation they can read.

## 3. Search

The current implementation uses textSearch("", query).

Verify the Supabase API usage and the actual database schema. Implement proper PostgreSQL full-text search over the intended recommendation fields, including an appropriate searchable column/index if needed.

Do not claim search is complete until it has been exercised and authorization is tested.

## 4. Permission matrix

Audit supabase/tests/permission_matrix.sql carefully.

The anonymous test must actually use the anon role rather than merely resetting from authenticated.

Separate these cases clearly:
- private recommendation + unauthorized viewer = no access
- private recommendation child records + unauthorized viewer = no access
- public profile/recommendation + viewer = access according to the intended product rules

Also verify that comments and ratings cannot leak private recommendations.

The LLM-as-user tests should be described accurately: SQL tests that set the same authenticated user identity verify the authorization model, but they are not yet an end-to-end MCP test.

## 5. Local acceptance testing

Run the local database/RLS tests if the environment allows it.

If Docker/Supabase CLI cannot be accessed from this shell, explain exactly what is blocking it. Do not weaken or skip security tests just to make the workflow pass.

## 6. Do not start mobile

Do not start mobile UI work yet.

The backend acceptance gate must pass first.

## 7. Before deploying

Do not deploy another migration until the code and tests have been reviewed and the local validation is as complete as the environment allows.

## Final report

When finished, report:
- files changed
- tests run and exact results
- whether local RLS tests passed
- whether API create was actually exercised
- whether re-recommendation was actually exercised
- whether search was actually exercised
- whether the backend acceptance gate passes
- any remaining blockers

Use the actual repository as the source of truth. Do not blindly trust the handoff or previous conversation. Do not make unrelated architectural changes.
