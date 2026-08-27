import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PlaceholderPage() {
  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow="Library">My recommendations</PageTitle>
        <div className="mt-8">
        <EmptyState
          icon="❑"
          title="My recommendations"
          description="Your recommendation library."
        />
        </div>
      </Page>
    </AppShell>
  );
}