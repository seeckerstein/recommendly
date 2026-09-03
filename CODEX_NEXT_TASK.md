Checkpoint 5.6 is finally approved.

Commit the current 5.6 changes as ONE commit:

"Checkpoint 5.6: finalize connected recommendation identity"

Before committing:
- verify the final diff contains only intentional 5.6 changes
- do not make any additional code changes
- no apply_patch
- no patch files
- no temporary files

Then:
1. commit the changes
2. verify the working tree is clean
3. report the commit hash

STOP after the commit.
Do NOT push.
Do NOT deploy.
Do NOT modify Supabase/Vercel.

This checkpoint includes:
- API-level self-exclusion for scope=connected
- MCP reliance on API-level self-exclusion
- owner_email in connected recommendation attribution
- updated MCP tests
- updated MCP tool descriptions
- existing Claude/ChatGPT documentation changes

Known TypeScript baseline:
- 17 root-level errors are pre-existing and unchanged
- production build passes
- 79/79 tests pass