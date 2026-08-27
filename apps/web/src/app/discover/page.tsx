import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PlaceholderPage() {
  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow="Explore">Discover</PageTitle>
        <div className="mt-8">
        <EmptyState
          icon="✦"
          title="Discover"
          description="Find people and recommendations."
        />
        </div>
      </Page>
    </AppShell>
  );
}