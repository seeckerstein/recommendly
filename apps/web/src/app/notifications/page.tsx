import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PlaceholderPage() {
  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow="Notifications">Activity</PageTitle>
        <div className="mt-8">
        <EmptyState
          icon="◔"
          title="Activity"
          description="Your activity will appear here."
        />
        </div>
      </Page>
    </AppShell>
  );
}