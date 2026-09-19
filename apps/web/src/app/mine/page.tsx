"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  RecommendationCard,
  RecommendationList,
} from "@/components/ui/RecommendationCard";
import { Modal } from "@/components/ui/Modal";
import {
  CardSkeletonList,
  EmptyState,
  ErrorState,
} from "@/components/ui/EmptyState";
import { categoryLabels } from "@/lib/recommendation-display";
import {
  fetchMyRecommendations,
  deleteRecommendation,
  type Recommendation,
} from "@/lib/api";

export default function MyRecommendationsPage() {
  const router = useRouter();
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [toDelete, setToDelete] = useState<Recommendation | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRecs(await fetchMyRecommendations());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteRecommendation(toDelete.id);
      setRecs((prev) => (prev ?? []).filter((r) => r.id !== toDelete.id));
      setToDelete(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  const present = Array.from(new Set((recs ?? []).map((r) => r.category_id)));
  const visible = (recs ?? []).filter((r) => filter === "all" || r.category_id === filter);

  return (
    <AppShell>
      <Page>
        <PageTitle
          eyebrow="My shelf"
          lede="Everything you've vouched for. Only people you've approved can see it."
          action={
            <ButtonLink href="/new" variant="accent">
              Share something
            </ButtonLink>
          }
        >
          My shelf
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

          {error && !loading && (
            <ErrorState message={error} onRetry={load} />
          )}

          {!loading && !error && recs?.length === 0 && (
            <EmptyState
              title="Your shelf is empty"
              description="Start with the last thing you told a friend they had to read, watch or try."
            >
              <ButtonLink href="/new" variant="accent">
                Share your first one
              </ButtonLink>
            </EmptyState>
          )}

          {!loading && !error && visible.length > 0 && (
            <RecommendationList>
              {visible.map((r) => (
                <RecommendationCard
                  key={r.id}
                  recommendation={r}
                  onEdit={(rec) => router.push(`/new?edit=${rec.id}`)}
                  onDelete={setToDelete}
                />
              ))}
            </RecommendationList>
          )}

          {!loading && !error && recs && recs.length > 0 && visible.length === 0 && (
            <EmptyState title="Nothing in this category yet" />
          )}
        </div>
      </Page>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete this recommendation?"
        description={`“${toDelete?.title ?? "This recommendation"}” will be removed from your shelf. This can't be undone.`}
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
