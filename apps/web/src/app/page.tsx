import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow="Home">Share something you love.</PageTitle>
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-neutral-600">
          Recommendly is a quiet place to keep and share the books, films, and
          places worth another person&apos;s time. Start by adding one — your
          recommendations will live here.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <ButtonLink href="/new" variant="accent" className="px-5 py-3 text-base">
            Share a recommendation
          </ButtonLink>
          <ButtonLink href="/mine" variant="secondary">View my library</ButtonLink>
        </div>
      </Page>
    </AppShell>
  );
}