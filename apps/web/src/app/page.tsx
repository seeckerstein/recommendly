import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow="Home">Your recommendations</PageTitle>
        <div className="mt-8">
          <EmptyState
            icon="◎"
            title="Nothing here yet"
            description={user.email ?? "Your network will appear here."}
          />
        </div>
      </Page>
    </AppShell>
  );
}