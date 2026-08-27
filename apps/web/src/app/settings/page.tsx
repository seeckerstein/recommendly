import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle, Card } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow="Account">Settings</PageTitle>

        <div className="mt-8 max-w-xl space-y-4">
          <Card>
            <h2 className="text-base font-semibold text-neutral-900">Account</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Your account is managed through your email login. Password changes and
              account deletion will be available in a later release.
            </p>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-neutral-900">Privacy</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Your profile visibility (private or public) controls who can discover
              you and see your recommendations. This setting will be manageable here
              in an upcoming update — for now it defaults to private.
            </p>
          </Card>

          <p className="text-xs text-neutral-400">Recommendly keeps things simple. More granular notification and preference options will arrive as the product grows.</p>
        </div>
      </Page>
    </AppShell>
  );
}