"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { RecommendationCard } from "@/components/ui/RecommendationCard";
import { fetchMyRecommendations, fetchMe, type Recommendation, type Profile } from "@/lib/api";

export default function MyRecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchMyRecommendations(), fetchMe()])
      .then(([r, p]) => { setRecs(r); setProfile(p); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const categoryById = new Map(profile ? [] : []);

  return (
    <AppShell>
      <Page>
        <div className="flex items-center justify-between">
          <PageTitle eyebrow="Library">My recommendations</PageTitle>
          <ButtonLink href="/new" variant="accent" className="shrink-0">Add new</ButtonLink>
        </div>

        <div className="mt-8 space-y-4">
          {loading && <p className="text-sm text-neutral-500">Loading…</p>}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}
          {!loading && !error && recs && recs.length === 0 && (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-neutral-300 bg-white px-8 py-16 text-center">
              <p className="text-lg font-medium text-neutral-900">Nothing here yet</p>
              <p className="mt-1.5 max-w-sm text-sm text-neutral-600">
                Share your first recommendation — it takes about a minute.
              </p>
              <ButtonLink href="/new" variant="accent" className="mt-6">Create one</ButtonLink>
            </div>
          )}
          {recs?.map((r) => (
            <RecommendationCard key={r.id} recommendation={r} />
          ))}
        </div>
      </Page>
    </AppShell>
  );
}