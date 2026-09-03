Checkpoint 5.6 is approved.

1. Commit the current 4 intentional files as a single checkpoint commit:
   "Checkpoint 5.6: connected recommendations MCP and AI onboarding"

2. Verify the commit contains only the intended 5.6 changes:
   - CODEX_NEXT_TASK.md
   - README.md
   - packages/domain/src/mcp-tools.test.ts
   - supabase/functions/mcp/mcp-tools.ts

3. Confirm the working tree is clean after the commit.

4. Push the new commit to origin/main.

5. Deploy ONLY the updated supabase/functions/mcp/index.ts + mcp-tools.ts MCP function to the existing hosted-dev Supabase project:
   zpjsmuuxgcewmymmdddr

   Do NOT redeploy or modify:
   - production Supabase
   - web/Vercel
   - API function
   - database schema
   - RLS
   - OAuth configuration

6. Verify the MCP function deployment succeeded and report:
   - commit hash
   - push confirmation
   - MCP function version/status
   - confirmation that production Supabase and web/Vercel were untouched

Editing rules still apply:
- No apply_patch.
- No patch files.
- No temporary files.
- If ANY edit/write/delete operation fails once, STOP immediately and report the exact failure. Do not retry.
- Do not make any further code changes unless required to complete the commit/deployment itself.

Do not perform manual Claude/ChatGPT testing; I will do that in Production after deployment.