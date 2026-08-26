We discovered a real issue during manual API testing that needs to be investigated and fixed.



Do NOT start mobile development yet.



Context:

\- The local Supabase stack is running.

\- The existing E2E tests previously passed:

&#x20; - 18/18 RLS tests

&#x20; - 8/8 unit tests

&#x20; - local HTTP E2E create/recommend/search/authorization flows

\- Those tests used the existing test users owner@test.local and other@test.local.

\- I manually created a NEW local Supabase Auth user:

&#x20; manual-test@example.local

\- I successfully obtained a JWT for that user.

\- GET /functions/v1/api/v1/recommendations with that JWT works and returns an empty result.

\- However, POST /functions/v1/api/v1/recommendations using that same JWT fails with:



&#x20; insert or update on table "recommendations" violates foreign key constraint

&#x20; "recommendations\_user\_id\_fkey"



This suggests that the normal Auth signup path creates an auth.users record but does not create the corresponding application-level user/profile record required by recommendations.user\_id.



Your task:



1\. Investigate the database schema and foreign-key relationship for:

&#x20;  - auth.users

&#x20;  - public users/profiles table(s)

&#x20;  - recommendations.user\_id



2\. Inspect the existing migrations and API implementation to determine how an authenticated user is expected to map from auth.users to the application user/profile record.



3\. Determine why the existing E2E fixture users work but a freshly created Auth user does not.



4\. Decide what the correct application behavior should be for a newly registered user.

&#x20;  Do not simply work around the foreign-key constraint or manually insert arbitrary IDs.



5\. If the intended architecture is that every authenticated user must have an application profile/user record, implement the appropriate signup/profile provisioning mechanism.



6\. Add or update automated tests that reproduce the failure with a newly created user and verify the correct behavior after the fix.



7\. Re-run:

&#x20;  - unit tests

&#x20;  - TypeScript check

&#x20;  - RLS permission matrix

&#x20;  - local HTTP E2E tests

&#x20;  - the new test covering a fresh Auth user



8\. Do NOT deploy anything to hosted Supabase.

9\. Do NOT modify production.

10\. Do NOT start mobile development.



Before changing code, explain briefly:

\- what the foreign key points to

\- why the manually-created Auth user fails

\- why the existing E2E users succeed

\- what you intend to change



Then make the smallest correct architectural fix.



At the end, report:

\- root cause

\- files changed

\- tests added/changed

\- complete test results

\- whether the manual API flow should now work

\- any remaining issues



Commit the fix only after all tests pass.

