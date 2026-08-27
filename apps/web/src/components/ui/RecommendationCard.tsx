"use client";

import { useState } from "react";
import { Card } from "./Card";
import { Tag } from "./Tag";
import { Button } from "./Button";
import type { Recommendation } from "@/lib/api";

const categoryLabels: Record<string, string> = {
  book: "Book",
  movie: "Movie",
  restaurant: "Restaurant",
};

const metadataLabels: Record<string, { key: string; label: string }[]> = {
  book: [
    { key: "author", label: "Author" },
    { key: "genre", label: "Genre" },
  ],
  movie: [
    { key: "director", label: "Director" },
    { key: "genre", label: "Genre" },
    { key: "year", label: "Year" },
    { key: "platform", label: "Platform" },
  ],
  restaurant: [
    { key: "location", label: "Location" },
    { key: "cuisine", label: "Cuisine" },
  ],
};

export function RecommendationCard({
  recommendation,
  categoryName,
  onEdit,
  onDelete,
}: {
  recommendation: Recommendation;
  categoryName?: string;
  onEdit?: (r: Recommendation) => void;
  onDelete?: (r: Recommendation) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = metadataLabels[recommendation.category_id] ?? [];
  const catLabel = categoryName ?? categoryLabels[recommendation.category_id] ?? recommendation.category_id;

  return (
    <Card className="relative flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-neutral-400">{catLabel}</span>

        {(onEdit || onDelete) && (
          <div className="relative -mt-1 -mr-2">
            <Button
              variant="ghost"
              aria-label="Recommendation actions"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="!px-2 !py-1"
            >
              ⋯
            </Button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-8 z-10 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-md"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {onEdit && (
                  <button
                    role="menuitem"
                    className="block w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-100 focus:bg-neutral-100 focus-visible:outline-none"
                    onClick={() => { setMenuOpen(false); onEdit(recommendation); }}
                  >
                    Edit recommendation
                  </button>
                )}
                {onDelete && (
                  <button
                    role="menuitem"
                    className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus-visible:outline-none"
                    onClick={() => { setMenuOpen(false); onDelete(recommendation); }}
                  >
                    Delete recommendation
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {recommendation.title && (
        <h3 className="text-lg font-semibold leading-snug text-neutral-900">{recommendation.title}</h3>
      )}

      <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{recommendation.comment}</p>

      {meta.some((m) => recommendation.metadata?.[m.key]) && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 sm:grid-cols-3">
          {meta.map(({ key, label }) => {
            const value = recommendation.metadata?.[key];
            if (!value) return null;
            return (
              <div key={key}>
                <dt className="font-medium text-neutral-500">{label}</dt>
                <dd className="text-neutral-800">{String(value)}</dd>
              </div>
            );
          })}
        </dl>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {recommendation.rating != null && (
            <span aria-label={`Rated ${recommendation.rating} out of 5`} className="text-orange-700">
              {"★".repeat(recommendation.rating)}
              <span className="opacity-30">{"★".repeat(5 - recommendation.rating)}</span>
            </span>
          )}
          {recommendation.tags?.map((tag) => <Tag key={tag}>#{tag}</Tag>)}
        </div>
        <time className="text-xs text-neutral-400" dateTime={recommendation.created_at}>
          {new Date(recommendation.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
        </time>
      </div>
    </Card>
  );
}