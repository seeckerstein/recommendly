"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle, Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button, ButtonLink } from "@/components/ui/Button";
import { createRecommendation } from "@/lib/api";
import { categorySlugs, type CategorySlug } from "recommendation-domain";

export default function NewRecommendationPage() {
  const router = useRouter();
  const [category, setCategory] = useState<CategorySlug>("book");
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    try {
      await createRecommendation({
        category,
        comment: comment.trim(),
        title: title.trim() || undefined,
        rating: (rating && rating >= 1 && rating <= 5 ? rating : undefined) as 1 | 2 | 3 | 4 | 5 | undefined,
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      });
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
        <PageTitle eyebrow="Create">New recommendation</PageTitle>
        <p className="mt-2 text-neutral-600">Share something you love.</p>

        <div className="mt-8 max-w-xl">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-5">
              <fieldset>
                <legend className="text-sm font-medium">Category</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categorySlugs.map((c) => (
                    <button
                      type="button" key={c}
                      onClick={() => setCategory(c)}
                      aria-pressed={category === c}
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
                <label htmlFor="title" className="block text-sm font-medium">Title (optional)</label>
                <Input id="title" value={title} placeholder="e.g. The Overstory"
                  onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium">Why do you love it? *</label>
                <Textarea id="comment" required minLength={1} value={comment}
                  placeholder="A few sentences — what makes it worth someone's time?"
                  onChange={(e) => setComment(e.target.value)} />
              </div>

              <details className="group">
                <summary className="cursor-pointer select-none text-sm font-medium text-neutral-600 hover:text-neutral-900">
                  Optional details
                </summary>
                <div className="mt-4 space-y-5">
                  <div>
                    <label htmlFor="rating" className="block text-sm font-medium">Rating</label>
                    <select id="rating" value={rating ?? ""}
                      onChange={(e) => setRating(e.target.value ? Number(e.target.value) : null)}
                      className="mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-orange-700 focus:outline-none"
                    >
                      <option value="">No rating</option>
                      {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium">Tags (comma separated)</label>
                    <Input id="tags" value={tagsInput} placeholder="slow-burn, translated, debut novel"
                      onChange={(e) => setTagsInput(e.target.value)} />
                  </div>
                </div>
              </details>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="accent" disabled={saving || !comment.trim()}>
                  {saving ? "Sharing…" : "Share recommendation"}
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