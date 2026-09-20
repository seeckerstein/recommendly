import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { InstallPrompt } from "./InstallPrompt";

const sections = [
  {
    title: "Your account",
    body: "You sign in with your email address. Password changes and account deletion aren't available in the app yet.",
  },
  {
    title: "Who can see your shelf",
    body: "Nothing you add is public. People have to ask for access, and you approve or decline each request from Activity. You can remove someone's access at any time from their profile.",
  },
  {
    title: "Assistants",
    body: "Once connected, an authorized assistant can read your recommendations and the recommendations from people you've connected with â€” but only where you already have access to them. It can create and update recommendations on your behalf. It cannot see recommendations from arbitrary users, and it never bypasses the normal authorization model.",
  },
];

export default function SettingsPage() {
  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow="Settings" lede="How Recommendly works for you, in plain terms.">
          Settings
        </PageTitle>

        <div className="mt-10 divide-y divide-line border-y border-line">
          {sections.map((s) => (
            <section key={s.title} className="py-6">
              <h2 className="display text-[1.125rem] leading-snug text-ink">{s.title}</h2>
              <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
                {s.body}
              </p>
            </section>
          ))}

          <section className="py-6">
            <h2 className="display text-[1.125rem] leading-snug text-ink">Connect Claude</h2>
            <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
              Claude can connect to Recommendly through its remote MCP server. It follows Recommendly&apos;s existing authorization model — it can read your own recommendations and those from connected users where you already have access, but never arbitrary users&apos; private recommendations.
            </p>
            <ol className="mt-4 ml-5 list-decimal space-y-1.5 text-[15px] leading-relaxed text-ink-soft">
              <li>In Claude, open Customize → Connectors.</li>
              <li>Click + / Add custom connector.</li>
              <li>Name it Recommendly.</li>
              <li>Enter the MCP server URL: <code className="rounded bg-surface-sunk px-1.5 py-0.5 text-[13px] text-ink">https://zpjsmuuxgcewmymmdddr.supabase.co/functions/v1/mcp</code></li>
              <li>Click Add.</li>
              <li>Authenticate with your Recommendly account when prompted.</li>
              <li>Approve access.</li>
              <li>Enable Recommendly from Claude&apos;s chat connector menu.</li>
            </ol>
            <div className="mt-5 rounded-xl border border-line bg-surface px-4 py-4">
              <p className="text-sm font-medium text-ink">Example prompts</p>
              <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-ink-soft">
                <li>&ldquo;Show me my recommendations.&rdquo;</li>
                <li>&ldquo;Show me recommendations from people I&apos;m connected to.&rdquo;</li>
                <li>&ldquo;Add The Rookie as a series with 3 stars.&rdquo;</li>
                <li>&ldquo;Update my recommendation for The Hobbit.&rdquo;</li>
              </ul>
            </div>
          </section>

          <section className="py-6">
            <h2 className="display text-[1.125rem] leading-snug text-ink">Get Recommendly on your phone</h2>
            <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
              Install Recommendly on your iPhone or Android home screen for a faster, app-like experience.
            </p>
            <div className="mt-5 space-y-5">
              <div className="rounded-xl border border-line bg-surface px-4 py-4">
                <p className="text-sm font-semibold text-ink">Android</p>
                <div className="mt-2"><InstallPrompt /></div>
              </div>
              <div className="rounded-xl border border-line bg-surface px-4 py-4">
                <p className="text-sm font-semibold text-ink">iPhone</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Open Recommendly in Safari, tap Share, choose &ldquo;Add to Home Screen&rdquo;, then confirm Add.
                </p>
              </div>
            </div>
          </section>
          <section className="py-6">
            <h2 className="display text-[1.125rem] leading-snug text-ink">This device</h2>
            <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
              Sign out of Recommendly here.
            </p>
            <form action="/auth/logout" method="post" className="mt-4">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-sunk"
              >
                Log out
              </button>
            </form>
          </section>
        </div>
      </Page>
    </AppShell>
  );
}
