The security review identified one important deployment concern: the new profile-provisioning trigger only handles newly-created auth.users and does not backfill existing users.



Before deploying to hosted dev:



1\. Inspect the current hosted-dev deployment strategy and migrations.

2\. Add a safe one-time backfill to the profile-provisioning migration so every existing auth.users row without a matching public.profiles row gets a profile.

3\. Make sure the backfill is idempotent and does not modify existing profiles.

4\. Add a test covering an existing auth user without a profile, if practical.

5\. Re-run the complete local validation:

&#x20;  - 8/8 unit tests

&#x20;  - TypeScript

&#x20;  - RLS matrix

&#x20;  - fresh-user HTTP E2E

6\. Review the final migration again.

7\. Do NOT deploy yet.

8\. Do NOT modify production.



Do not change anything unrelated to this backfill.

Explain the exact SQL and why it is safe before committing.

