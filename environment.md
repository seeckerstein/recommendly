# Recommendly Development Environment

Last verified: 2026-10-10

This document records the verified development environment and the rules needed to keep Codex, Git, Supabase, Vercel, and the Recommendly repository working as one reproducible chain.

## 1. Machine baseline

Windows development machine.

Verified global tools:

| Tool           | Version          | Location / notes                                                   |
| -------------- | ---------------- | ------------------------------------------------------------------ |
| Node.js        | 26.8.1           | `C:\Program Files\nodejs\node.exe`                                 |
| npm            | 11.19.0          | bundled with Node                                                  |
| pnpm           | 12.11.0 global   | Recommendly resolves 11.19.0 because of its `packageManager` field |
| Git            | 2.56.0.windows.2 | `C:\Program Files\Git\cmd\git.exe`                                 |
| GitHub CLI     | 2.102.0          | WinGet Links                                                       |
| Vercel CLI     | 63.1.0           | npm global                                                         |
| Supabase CLI   | 2.120.0          | Scoop                                                              |
| Docker         | 29.8.2           | Docker Desktop / WSL2                                              |
| Docker Compose | 5.5.1            | Docker CLI plugin                                                  |
| Scoop          | 0.6.0            | package manager                                                    |
| Codex          | 0.162.0          | ChatGPT/Codex desktop environment                                  |

No `.nvmrc` or `.node-version` is currently used by Recommendly.

Do not downgrade Node merely to satisfy an assumed LTS preference. Node 26 is the verified working machine baseline.

## 2. Recommendly project versions

The repository currently declares:

- `packageManager: pnpm@11.19.0`
- project-local Supabase CLI dependency: `^2.115.0`

Within Recommendly, `pnpm --version` resolves to 11.19.0. This is intentional project reproducibility and must not be changed just because the global pnpm is newer.

Use the project-local Supabase CLI for project operations. The global 2.120.0 installation is the machine-wide convenience CLI; it does not replace the project's dependency.

Do not perform broad application dependency upgrades as part of environment maintenance unless a concrete compatibility problem requires them.

## 3. Authentication/access

Verified working:

### GitHub

- GitHub CLI authenticated as `seeckerstein`.
- `seeckerstein/recommendly` is accessible.
- Default branch is `main`.
- Git remote uses the Recommendly GitHub repository.

### Vercel

- Vercel CLI authenticated as `johaneckerstein-1427`.
- Active team: `johaneckerstein-1427's projects`.
- Plan: Hobby.
- Recommendly deployment access must still be treated as production access; authentication alone is not permission to deploy.

### Supabase

- CLI authenticated.
- **The only Supabase project for Recommendly is `recommendly-dev` (`zpjsmuuxgcewmymmdddr`), and the owner has explicitly confirmed that this is also the intended production project. There is no separate production project.**
- Supabase dashboard showed the project as Healthy and displayed a `PRODUCTION` environment badge for the selected `main` branch. The project name remains `recommendly-dev`; do not infer that a separate production project exists.
- Project URL: `https://zpjsmuuxgcewmymmdddr.supabase.co`.
- **Production target confirmed by owner:** use ref `zpjsmuuxgcewmymmdddr` when performing explicitly approved production migration verification/deployment.
- Keep local development isolated: use the local Supabase stack for resets and DB tests. Do not treat the hosted production project as a disposable development target or run destructive local-reset workflows against it.

Never put access tokens, service-role keys, passwords, or secrets into Git, prompts, logs, or documentation.

## 4. Docker / local Supabase

Docker Desktop is healthy and uses the `desktop-linux` WSL2 context.

Normal local workflow:

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

Use the project-local CLI for these operations.

Do not run `supabase start` from unrelated directories such as `C:\Windows\System32`.

Do not stop/restart/reconfigure Docker merely because an individual command fails. Diagnose the actual failure first.

## 5. Codex Windows environment

Codex 0.162.0 is launched by the ChatGPT desktop application and its app-server constructs the executor environment.

The Windows User PATH correctly contains the Scoop and WinGet locations, but the Codex desktop executor does not reliably inherit those User PATH entries.

The verified solution is an explicit stable PATH in:

```text
%USERPROFILE%\.codex\config.toml
```

The relevant configuration is:

```toml
[shell_environment_policy]
inherit = "all"
ignore_default_excludes = true

[shell_environment_policy.set]
Path = "C:\\Users\\seeckerstein\\scoop\\shims;C:\\Users\\seeckerstein\\AppData\\Local\\Microsoft\\WinGet\\Links;C:\\Users\\seeckerstein\\AppData\\Roaming\\npm;C:\\Program Files\\nodejs;C:\\Program Files\\Git\\cmd;C:\\WINDOWS\\system32;C:\\WINDOWS;C:\\WINDOWS\\System32\\Wbem;C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0;C:\\WINDOWS\\System32\\OpenSSH;C:\\ProgramData\\chocolatey\\bin;C:\\Users\\seeckerstein\\AppData\\Local\\Microsoft\\WindowsApps;C:\\Users\\seeckerstein\\AppData\\Local\\Programs\\Ollama;C:\\Users\\seeckerstein\\AppData\\Local\\Programs\\Antigravity IDE\\bin;C:\\Users\\seeckerstein\\.lmstudio\\bin;C:\\Users\\seeckerstein\\AppData\\Local\\PowerToys\\DSCModules;C:\\Users\\seeckerstein\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin"
```

Do not add Codex-generated temporary paths such as `.codex\\tmp\\arg0\\...` or version-specific `codex-path` directories to this permanent PATH. They are implementation details and change across Codex updates.

This explicit PATH is required so Codex can resolve:

- `gh`
- `supabase`
- `vercel`
- `node`
- `pnpm`
- `git`

If this configuration changes, verify all six commands before doing development work.

Do not change the Windows Machine PATH to compensate for a Codex executor problem.

## 6. Codex configuration principles

Current Codex setup is intentionally local-development oriented:

- primary model: `gpt-6-luna`
- reasoning effort: high
- `sandbox_mode = "danger-full-access"`
- `approval_policy = "never"`
- Recommendly project is trusted
- OpenRouter fallback configuration is retained only as commented configuration
- `js_repl = false`

Do not remove working Codex configuration merely to make the file shorter. Configuration changes must have a reason and should be verified after restart.

If Codex reports daemon/app-server incompatibility, distinguish the Codex runtime problem from a repository problem before changing project files.

## 7. Git workflow

Git is authoritative.

Normal sequence:

```text
inspect -> feature branch -> edit -> diff -> test -> commit -> push -> PR -> review -> merge
```

Never bypass the repository workflow for Supabase or Vercel.

For production Supabase schema changes:

```text
migration file in Git
    -> review
    -> merge
    -> project-local Supabase CLI
    -> production
```

Do not use a management API/tool to apply a migration that has not travelled through the repository workflow.

## 7A. Supabase release parity: migrations vs Edge Functions

Supabase migrations and Edge Functions are independent deployment units. A migration can be applied while the production Edge Function remains on an older version; the reverse is also possible. A green migration dry run says nothing about whether function code is current.

For an explicitly authorized production release, use the project-local CLI and explicit project ref `zpjsmuuxgcewmymmdddr`. Verify the merged commit, inspect remote migration history and dry-run before applying only intended committed migrations, then separately deploy each changed function. After deployment, retrieve the deployed function source/version and confirm it contains the expected handlers and RPC calls. Perform a safe end-to-end smoke test where possible. Do not assume connecting GitHub enables all deployment steps; check the project's actual integration/workflow configuration. Never deploy without explicit authorization.

## 8. Environment troubleshooting rules

When something fails:

1. Reproduce once.
2. Identify whether it is code, configuration, authentication, network, or environment.
3. Inspect the relevant layer.
4. Make the smallest controlled change.
5. Verify.
6. Stop if the same environment failure occurs twice.

Do not:

- reinstall working tools;
- change Node/pnpm versions without evidence;
- modify global Git configuration casually;
- alter Windows Machine PATH to hide a Codex problem;
- rewrite project files to compensate for missing executables;
- loop on the same failed command.

## 9. Production safety

Recommendly currently has one hosted Supabase project, `recommendly-dev` (`zpjsmuuxgcewmymmdddr`), and the owner has explicitly confirmed it is the production project; there is no separate production Supabase project. The dashboard's `PRODUCTION` badge refers to the selected production environment/branch, even though the project name includes `-dev`.

Before any stateful remote action, explicitly identify the target:

- local Supabase stack for development/tests
- hosted production Supabase project: `zpjsmuuxgcewmymmdddr`

Production deployment is an explicit action, not a side effect of testing. Verify migration history first, ensure migration files are committed and reviewed/merged according to the Git workflow, and deploy only when explicitly authorized. Never run destructive local-reset workflows against the hosted production project.

No direct production SQL. No dashboard-only schema changes. No uncommitted migration deployment.

## 10. Current known repository condition

The last verified audit found:

- no environment blockers;
- Recommendly Git working tree otherwise clean;
- `youdlike_logo.png` intentionally untracked and untouched;
- `CODEX_NEXT_TASK.md` was historical task context and is being removed;
- `environment.md` was previously absent and is now the authoritative environment document.

Do not restore `CODEX_NEXT_TASK.md` as an instruction source.

## 11. Verification checklist

When the environment changes, verify:

```powershell
node --version
npm --version
pnpm --version
git --version
gh --version
supabase --version
vercel --version
docker --version
docker compose version
```

Then verify:

```powershell
gh auth status
vercel whoami
supabase projects list
docker info
```

For Recommendly, verify:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm format:check
```

Database tests should be run when database changes are involved.

These checks are evidence, not rituals. Do not run destructive/local-reset commands unless the task requires them.
