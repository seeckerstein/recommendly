import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PlaceholderPage() {
  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow="Create">New recommendation</PageTitle>
        <div className="mt-8">
        <EmptyState
          icon="＋"
          title="New recommendation"
          description="Share something you love."
        />
        </div>
      </Page>
    </AppShell>
  );
}