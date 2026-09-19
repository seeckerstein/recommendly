"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import {
  RecommendationCard,
  RecommendationList,
} from "@/components/ui/RecommendationCard";
import {
  CardSkeletonList,
  EmptyState,
  ErrorState,
} from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { categoryLabels } from "@/lib/recommendation-display";
import { fetchDiscoverRecommendations, type Recommendation } from "@/lib/api";

export default function DiscoverRecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  function load() {
    setLoading(true);
    setError(null);
    fetchDiscoverRecommendations()
      .then(setRecs)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const present = Array.from(new Set((recs ?? []).map((r) => r.category_id)));
  const visible = (recs ?? []).filter((r) => filter === "all" || r.category_id === filter);

  return (
    <AppShell>
      <Page>
        <PageTitle
          eyebrow="Recommended to you"
          lede="From the people who've approved your request. Newest first."
        >
          Worth your time
        </PageTitle>

        {present.length > 1 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {["all", ...present].map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={filter === c}
                onClick={() => setFilter(c)}
                className={`min-h-9 rounded-full border px-3.5 text-[13px] transition-colors ${
                  filter === c
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong text-ink-soft hover:bg-surface-sunk hover:text-ink"
                }`}
              >
                {c === "all" ? "Everything" : (categoryLabels[c] ?? c)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-10">
          {loading && <CardSkeletonList />}

          {error && !loading && <ErrorState message={error} onRetry={load} />}

          {!loading && !error && recs?.length === 0 && (
            <EmptyState
              title="Nothing here yet"
              description="Once someone approves your request, everything they recommend shows up on this page."
            >
              <ButtonLink href="/discover" variant="accent">
                Find people
              </ButtonLink>
            </EmptyState>
          )}

          {!loading && !error && visible.length > 0 && (
            <RecommendationList>
              {visible.map((r) => (
                <RecommendationCard
                  key={r.id}
                  recommendation={r}
                  owner={{ id: r.owner_id, name: r.owner_name, email: r.owner_email }}
                />
              ))}
            </RecommendationList>
          )}

          {!loading && !error && recs && recs.length > 0 && visible.length === 0 && (
            <EmptyState title="Nothing in this category yet" />
          )}
        </div>
      </Page>
    </AppShell>
  );
}
