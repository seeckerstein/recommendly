"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle, Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  createRecommendation,
  updateRecommendation,
  fetchMyRecommendations,
  getCategoryMap,
} from "@/lib/api";
import { categorySlugs, type CategorySlug } from "recommendation-domain";

type MetadataKey = Record<CategorySlug, { key: string; label: string; placeholder?: string }[]>;

const metadataFields: MetadataKey = {
  book: [
    { key: "author", label: "Author", placeholder: "e.g. Richard Powers" },
    { key: "genre", label: "Genre", placeholder: "e.g. Literary fiction" },
  ],
  movie: [
    { key: "director", label: "Director / Creator", placeholder: "e.g. Denis Villeneuve" },
    { key: "genre", label: "Genre", placeholder: "e.g. Science fiction" },
    { key: "year", label: "Year", placeholder: "e.g. 2021" },
    { key: "platform", label: "Streaming platform", placeholder: "e.g. Netflix" },
  ],
  restaurant: [
    { key: "location", label: "Location", placeholder: "City or neighbourhood" },
    { key: "cuisine", label: "Cuisine", placeholder: "e.g. Thai" },
  ],
};

const titleLabels: Record<CategorySlug, string> = {
  book: "Book title",
  movie: "Movie or show title",
  restaurant: "Restaurant name",
};

function NewRecommendationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [category, setCategory] = useState<CategorySlug>("book");
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    fetchMyRecommendations()
      .then((recs) => {
        const rec = recs.find((r) => r.id === editId);
        if (!rec) throw new Error("Recommendation not found.");
        setComment(rec.comment);
        setTitle(rec.title ?? "");
        if (rec.rating) setRating(rec.rating);
        setTagsInput((rec.tags ?? []).join(", "));
        setMetadata(Object.fromEntries(Object.entries(rec.metadata ?? {}).map(([k, v]) => [k, String(v)])));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  function switchCategory(next: CategorySlug) {
    setCategory(next);
    setMetadata({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const cleanMetadata = Object.fromEntries(Object.entries(metadata).filter(([, v]) => v.trim()));
      const catMap = await getCategoryMap();
      const category_id = catMap.get(category);
      if (!category_id) throw new Error("Invalid category selected.");
      const payload = {
        category,
        category_id,
        comment: comment.trim() || undefined,
        title: title.trim() || undefined,
        rating: (rating ?? undefined) as 1 | 2 | 3 | 4 | 5 | undefined,
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        metadata: cleanMetadata,
      };

      if (editId) await updateRecommendation(editId, payload);
      else await createRecommendation(payload);

      router.push("/mine");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow={editId ? "Edit" : "Create"}>{editId ? "Edit recommendation" : "New recommendation"}</PageTitle>
        <p className="mt-2 text-neutral-600">Share something you love.</p>

        <div className="mt-8 max-w-xl">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-5">
              <fieldset>
                <legend className="text-sm font-medium">Category *</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categorySlugs.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => switchCategory(c)}
                      aria-pressed={category === c}
                      disabled={false}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition ${
                        category === c
                          ? "border-orange-700 bg-orange-700 text-white"
                          : "border-neutral-300 bg-white hover:bg-neutral-100"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="title" className="block text-sm font-medium">{titleLabels[category]} *</label>
                <Input id="title" value={title} required onChange={(e) => setTitle(e.target.value)} />
              </div>

              {(metadataFields[category] ?? []).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label htmlFor={`meta-${key}`} className="block text-sm font-medium">{label} (optional)</label>
                  <Input
                    id={`meta-${key}`}
                    value={metadata[key] ?? ""}
                    placeholder={placeholder}
                    onChange={(e) => setMetadata({ ...metadata, [key]: e.target.value })}
                  />
                </div>
              ))}

              <div>
                <label htmlFor="comment" className="block text-sm font-medium">Why do you love it? (optional)</label>
                <Textarea
                  id="comment"
                  value={comment}
                  placeholder="A few sentences — what makes it worth someone's time?"
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="rating" className="block text-sm font-medium">Rating (optional)</label>
                <select
                  id="rating"
                  value={rating ?? ""}
                  onChange={(e) => setRating(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-orange-700 focus:outline-none"
                >
                  <option value="">No rating</option>
                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium">Tags (comma separated, optional)</label>
                <Input id="tags" value={tagsInput} placeholder="slow-burn, translated" onChange={(e) => setTagsInput(e.target.value)} />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {loadingEdit && <p className="text-sm text-neutral-500">Loading recommendation…</p>}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="accent" disabled={saving || !title.trim() || loadingEdit}>
                  {saving ? "Saving…" : editId ? "Save changes" : "Share recommendation"}
                </Button>
                <ButtonLink href="/mine" variant="ghost">Cancel</ButtonLink>
              </div>
            </form>
          </Card>
        </div>
      </Page>
    </AppShell>
  );
}
export default function NewRecommendationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-neutral-500">Loading…</div>}>
      <NewRecommendationForm />
    </Suspense>
  );
}