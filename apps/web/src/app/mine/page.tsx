"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { RecommendationCard } from "@/components/ui/RecommendationCard";
import { Modal } from "@/components/ui/Modal";
import {
  fetchMyRecommendations,
  deleteRecommendation,
  type Recommendation,
} from "@/lib/api";

export default function MyRecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<Recommendation | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRecs(await fetchMyRecommendations());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

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
            <RecommendationCard
              key={r.id}
              recommendation={r}
              onEdit={(rec) => window.location.assign(`/new?edit=${rec.id}`)}
              onDelete={setToDelete}
            />
          ))}
        </div>
      </Page>

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete this recommendation?">
        <p className="text-sm text-neutral-600">
          This will remove “{toDelete?.title ?? "this recommendation"}” from your library. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button>
          <Button onClick={confirmDelete} disabled={deleting} className="!bg-red-600 hover:!bg-red-500 !text-white">
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}