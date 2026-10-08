import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { InstallPrompt } from "./InstallPrompt";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { EmailNotificationSettings } from "./EmailNotificationSettings";
import { PushNotificationSettings } from "./PushNotificationSettings";

const sections = [
  {
    title: "Your account",
    body: "You sign in with your email address. Password changes and account deletion are available below.",
  },
  {
    title: "Who can see your shelf",
    body: "Nothing you add is public. People have to ask for access, and you approve or decline each request from Activity. You can remove someone's access at any time from their profile.",
  },
  {
    title: "Assistants",
    body: "Once connected, an authorized assistant can read your recommendations and the recommendations from people you've connected with — but only where you already have access to them. It can create and update recommendations on your behalf. It cannot see recommendations from arbitrary users, and it never bypasses the normal authorization model.",
  },
];

export default function SettingsPage() {
  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow="Settings" lede="How YOU'D LIKE works for you, in plain terms.">
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
              Claude can connect to YOU&#39;D LIKE through its remote MCP server. It follows YOU&#39;D LIKE&#39;s existing authorization model, so Claude can read your own recommendations and recommendations from people you are connected to, subject to the access you already have.
            </p>
            <h3 className="mt-5 text-sm font-medium text-ink">Connect YOU&#39;D LIKE to Claude</h3>
            <ol className="mt-3 ml-5 list-decimal space-y-1.5 text-[15px] leading-relaxed text-ink-soft">
              <li>In Claude, open <strong className="font-medium text-ink">Customize → Connectors</strong>.</li>
              <li>Click <strong className="font-medium text-ink">+</strong> next to Connectors and select <strong className="font-medium text-ink">Add custom connector</strong>.</li>
              <li>Enter <strong className="font-medium text-ink">YOU&#39;D LIKE</strong> as the connector name.</li>
              <li>Enter the MCP server URL: <code className="rounded bg-surface-sunk px-1.5 py-0.5 text-[13px] text-ink">https://zpjsmuuxgcewmymmdddr.supabase.co/functions/v1/mcp</code></li>
              <li>Click <strong className="font-medium text-ink">Add</strong>.</li>
              <li>Click <strong className="font-medium text-ink">Connect</strong> if Claude prompts you to connect the new connector.</li>
              <li>Sign in with your YOU&#39;D LIKE account when prompted.</li>
              <li>Review the requested permissions and click <strong className="font-medium text-ink">Allow access</strong>.</li>
              <li>Enable <strong className="font-medium text-ink">YOU&#39;D LIKE</strong> for your conversation from Claude&#39;s <strong className="font-medium text-ink">+ → Connectors</strong> menu.</li>
            </ol>
            <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink-soft">
              Once connected, Claude can use YOU&#39;D LIKE&#39;s recommendations within your existing account permissions.
            </p>
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
            <h2 className="display text-[1.125rem] leading-snug text-ink">Connect ChatGPT</h2>
            <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
              ChatGPT can connect to YOU&#39;D LIKE through its remote MCP server. It follows YOU&#39;D LIKE&#39;s existing authorization model, so ChatGPT can use your recommendations within the permissions of your YOU&#39;D LIKE account.
            </p>
            <h3 className="mt-5 text-sm font-medium text-ink">Connect YOU&#39;D LIKE to ChatGPT</h3>
            <ol className="mt-3 ml-5 list-decimal space-y-1.5 text-[15px] leading-relaxed text-ink-soft">
              <li>In ChatGPT, open <strong className="font-medium text-ink">Settings → Apps</strong> and enable <strong className="font-medium text-ink">Developer Mode</strong> if available.</li>
              <li>Click <strong className="font-medium text-ink">Create</strong> and select <strong className="font-medium text-ink">Create app</strong>.</li>
              <li>Enter <strong className="font-medium text-ink">YOU&#39;D LIKE</strong> as the app name.</li>
              <li>Enter the MCP server URL: <code className="rounded bg-surface-sunk px-1.5 py-0.5 text-[13px] text-ink">https://zpjsmuuxgcewmymmdddr.supabase.co/functions/v1/mcp</code></li>
              <li>Select <strong className="font-medium text-ink">OAuth</strong> as the authentication method when prompted.</li>
              <li>Click <strong className="font-medium text-ink">Scan Tools</strong>.</li>
              <li>Sign in with your YOU&#39;D LIKE account when prompted.</li>
              <li>Review the requested permissions and approve access.</li>
              <li>Complete the app setup.</li>
              <li>Open a new ChatGPT conversation and select <strong className="font-medium text-ink">YOU&#39;D LIKE</strong> from the tools/apps menu.</li>
            </ol>
            <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink-soft">
              Once connected, ChatGPT can use YOU&#39;D LIKE&#39;s recommendations within your existing account permissions. For actions that create or modify recommendations, ChatGPT may ask you to confirm the action.
            </p>
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
            <h2 className="display text-[1.125rem] leading-snug text-ink">Get YOU'D LIKE on your phone</h2>
            <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
              Install YOU'D LIKE on your home screen for a faster, app-like experience.
            </p>
            <div className="mt-5 space-y-5">
              <div className="rounded-xl border border-line bg-surface px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Android &mdash; Chrome</p>
                <div className="mt-3"><InstallPrompt /></div>
                <ol className="mt-3 ml-5 list-decimal space-y-1 text-sm leading-relaxed text-ink-soft">
                  <li>Open YOU'D LIKE in Chrome.</li>
                  <li>Tap the &#8942; menu in the top-right.</li>
                  <li>Choose &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;.</li>
                  <li>Confirm the installation.</li>
                </ol>
              </div>
              <div className="rounded-xl border border-line bg-surface px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">iPhone &mdash; Safari</p>
                <ol className="mt-3 ml-5 list-decimal space-y-1 text-sm leading-relaxed text-ink-soft">
                  <li>Open YOU'D LIKE in Safari.</li>
                  <li>Tap the Share button.</li>
                  <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;.</li>
                  <li>Tap &ldquo;Add&rdquo;.</li>
                </ol>
              </div>
            </div>
          </section>
          <EmailNotificationSettings />
          <DeleteAccountSection />

          <section className="py-6">
            <h2 className="display text-[1.125rem] leading-snug text-ink">This device</h2>
            <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
              Sign out of YOU'D LIKE here.
            </p>
            <PushNotificationSettings />
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
