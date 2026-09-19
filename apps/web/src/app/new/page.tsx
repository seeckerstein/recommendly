"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle, SectionHeading } from "@/components/ui/Card";
import { Input, Field } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button, ButtonLink } from "@/components/ui/Button";
import { RatingInput } from "@/components/ui/Rating";
import { ErrorState } from "@/components/ui/EmptyState";
import {
  createRecommendation,
  updateRecommendation,
  fetchMyRecommendations,
  getCategoryMap,
} from "@/lib/api";
import {
  categoryLabels,
  commentPrompts,
  metadataFields,
  titleLabels,
  titlePlaceholders,
} from "@/lib/recommendation-display";
import { categorySlugs, type CategorySlug } from "recommendation-domain";

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
        if ((categorySlugs as readonly string[]).includes(rec.category_id)) {
          setCategory(rec.category_id as CategorySlug);
        }
        setComment(rec.comment);
        setTitle(rec.title ?? "");
        if (rec.rating) setRating(rec.rating);
        setTagsInput((rec.tags ?? []).join(", "));
        setMetadata(
          Object.fromEntries(
            Object.entries(rec.metadata ?? {}).map(([k, v]) => [k, String(v)]),
          ),
        );
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
      const cleanMetadata = Object.fromEntries(
        Object.entries(metadata).filter(([, v]) => v.trim()),
      );
      const catMap = await getCategoryMap();
      const category_id = catMap.get(category);
      if (!category_id) throw new Error("Invalid category selected.");
      const payload = {
        category,
        category_id,
        comment: comment.trim() || undefined,
        title: title.trim() || undefined,
        rating: (rating ?? undefined) as 1 | 2 | 3 | 4 | 5 | undefined,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
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

  const extras = metadataFields[category] ?? [];

  return (
    <AppShell>
      <Page>
        <PageTitle
          eyebrow={editId ? "Edit" : "Share"}
          lede={
            editId
              ? "Change anything you like — the people connected to you will see the updated version."
              : "One thing you'd genuinely put in someone's hands. The reason matters more than the rating."
          }
        >
          {editId ? "Edit your recommendation" : "What's worth someone's time?"}
        </PageTitle>

        {loadingEdit ? (
          <p className="mt-10 text-sm text-ink-faint">Loading recommendation…</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-10">
            <fieldset className="space-y-3">
              <legend className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                What is it?
              </legend>
              <div className="flex flex-wrap gap-2">
                {categorySlugs.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => switchCategory(c)}
                    aria-pressed={category === c}
                    className={`min-h-10 rounded-full border px-4 text-sm transition-colors ${
                      category === c
                        ? "border-accent bg-accent text-white"
                        : "border-line-strong bg-surface text-ink-soft hover:bg-surface-sunk hover:text-ink"
                    }`}
                  >
                    {categoryLabels[c] ?? c}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="space-y-5">
              <Field htmlFor="title" label={titleLabels[category]}>
                <Input
                  id="title"
                  value={title}
                  required
                  placeholder={titlePlaceholders[category]}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>

              <Field
                htmlFor="comment"
                label="Your reason"
                optional
                hint="This is the part people actually read."
              >
                <Textarea
                  id="comment"
                  rows={5}
                  value={comment}
                  placeholder={commentPrompts[category]}
                  onChange={(e) => setComment(e.target.value)}
                />
              </Field>

              <Field htmlFor="rating" label="Rating" optional>
                <div id="rating">
                  <RatingInput name="rating" value={rating} onChange={setRating} />
                </div>
              </Field>
            </div>

            {extras.length > 0 && (
              <div className="space-y-5">
                <SectionHeading hint="all optional">Details</SectionHeading>
                <div className="grid gap-5 sm:grid-cols-2">
                  {extras.map(({ key, label, placeholder }) => (
                    <Field key={key} htmlFor={`meta-${key}`} label={label} optional>
                      <Input
                        id={`meta-${key}`}
                        value={metadata[key] ?? ""}
                        placeholder={placeholder}
                        onChange={(e) => setMetadata({ ...metadata, [key]: e.target.value })}
                      />
                    </Field>
                  ))}
                  <Field
                    htmlFor="tags"
                    label="Tags"
                    optional
                    hint="Separate with commas."
                  >
                    <Input
                      id="tags"
                      value={tagsInput}
                      placeholder="slow-burn, translated"
                      onChange={(e) => setTagsInput(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            )}

            {error && <ErrorState title="Couldn't save that" message={error} />}

            <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] flex items-center gap-3 border-t border-line bg-paper/90 py-4 backdrop-blur-md md:static md:bg-transparent md:backdrop-blur-none">
              <Button
                type="submit"
                variant="accent"
                size="lg"
                disabled={saving || !title.trim()}
              >
                {saving ? "Saving…" : editId ? "Save changes" : "Add to my shelf"}
              </Button>
              <ButtonLink href="/mine" variant="ghost" size="lg">
                Cancel
              </ButtonLink>
            </div>
          </form>
        )}
      </Page>
    </AppShell>
  );
}

export default function NewRecommendationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-faint">Loading…</div>}>
      <NewRecommendationForm />
    </Suspense>
  );
}
