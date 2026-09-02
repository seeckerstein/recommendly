"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { RecommendationCard } from "@/components/ui/RecommendationCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { fetchDiscoverRecommendations, type Recommendation } from "@/lib/api";

export default function DiscoverRecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDiscoverRecommendations()
      .then(setRecs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow="Explore">Discover Recommendations</PageTitle>

        <div className="mt-8 space-y-4">
          {loading && <p className="text-sm text-neutral-500">Loading…</p>}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}
          {!loading && !error && recs && recs.length === 0 && (
            <EmptyState
              icon="✦"
              title="No recommendations from your connections yet."
              description="Find people and connect with them to see their recommendations here."
            >
              <ButtonLink href="/discover" variant="accent" className="mt-6">
                Find People
              </ButtonLink>
            </EmptyState>
          )}
          {recs?.map((r) => (
            <RecommendationCard key={r.id} recommendation={r} ownerName={r.owner_name} />
          ))}
        </div>
      </Page>
    </AppShell>
  );
}