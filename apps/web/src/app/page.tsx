import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/nav/AppShell";
import { Page } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

const paths = [
  {
    href: "/discover-recommendations",
    title: "Recommended to you",
    body: "Everything the people who've approved you have vouched for.",
  },
  {
    href: "/mine",
    title: "My shelf",
    body: "The books, films, series and places you've put your name to.",
  },
  {
    href: "/discover",
    title: "Find people",
    body: "Search by name or email, then ask for access to their shelf.",
  },
];

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <AppShell>
      <Page>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Recommendly
        </p>
        <h1 className="display mt-4 text-[2.5rem] font-normal leading-[1.05] text-ink sm:text-[3.5rem]">
          Recommendations
          <br />
          from people you
          <br />
          actually trust.
        </h1>
        <p className="mt-6 max-w-prose text-[1.0625rem] leading-relaxed text-ink-soft">
          No algorithm, no ratings-average, no strangers. Just the things the
          people you&apos;ve connected with would hand you in person — and the
          reason they think it&apos;s worth your time.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <ButtonLink href="/new" variant="accent" size="lg">
            Share a recommendation
          </ButtonLink>
          <ButtonLink href="/discover-recommendations" variant="secondary" size="lg">
            See what&apos;s recommended to you
          </ButtonLink>
        </div>

        <div className="mt-16 divide-y divide-line border-t border-line">
          {paths.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group flex items-baseline gap-5 py-6 transition-colors hover:bg-surface-sunk/40"
            >
              <div className="min-w-0 flex-1">
                <h2 className="display text-[1.25rem] leading-snug text-ink">{p.title}</h2>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{p.body}</p>
              </div>
              <span
                aria-hidden
                className="shrink-0 text-accent transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </Page>
    </AppShell>
  );
}
