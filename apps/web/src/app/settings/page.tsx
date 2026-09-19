import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";

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
    body: "Once connected, an authorized assistant can read your recommendations and the recommendations from people you've connected with — but only where you already have access to them. It can create and update recommendations on your behalf. It cannot see recommendations from arbitrary users, and it never bypasses the normal authorization model.",
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
