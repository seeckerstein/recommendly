"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { Rating } from "./Rating";
import type { Recommendation } from "@/lib/api";
import {
  categoryLabels,
  formatDate,
  metadataByline,
  secondaryMetadata,
} from "@/lib/recommendation-display";

export type RecommendationCardProps = {
  recommendation: Recommendation;
  /** Category display name, when the caller already resolved one. */
  categoryName?: string;
  /**
   * Attribution for recommendations that belong to someone else.
   * Omit entirely for the signed-in user's own shelf.
   */
  owner?: { id?: string; name?: string | null; email?: string | null; avatarUrl?: string | null };
  /** Show the owner's email under their name to disambiguate identical names. */
  showOwnerEmail?: boolean;
  onEdit?: (r: Recommendation) => void;
  onDelete?: (r: Recommendation) => void;
};

/**
 * A shelf entry. Reads person â†’ reason â†’ title â†’ quiet supporting detail.
 * Deliberately borderless: entries are separated by a hairline rule from the
 * list that contains them, so the page reads like a page, not a grid of boxes.
 */
export function RecommendationCard({
  recommendation,
  categoryName,
  owner,
  showOwnerEmail = true,
  onEdit,
  onDelete,
}: RecommendationCardProps) {
  const category = recommendation.category_id;
  const catLabel = categoryName ?? categoryLabels[category] ?? category;
  const byline = metadataByline(category, recommendation.metadata);
  const extras = secondaryMetadata(category, recommendation.metadata);
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <article className="group relative py-8 first:pt-0">
      {owner?.name && (
        <div className="mb-4 flex items-center gap-2.5">
          <Avatar name={owner.name} src={owner.avatarUrl ?? null} size={30} />
          <p className="min-w-0 text-sm text-ink-soft">
            {owner.id ? (
              <Link
                href={`/discover/${owner.id}`}
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                {owner.name}
              </Link>
            ) : (
              <span className="font-medium text-ink">{owner.name}</span>
            )}{" "}
            recommends
            {showOwnerEmail && owner.email && (
              <span className="block truncate text-xs text-ink-faint">{owner.email}</span>
            )}
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            {catLabel}
          </p>

          {recommendation.title && (
            <h3 className="display mt-2 text-[1.5rem] font-normal leading-[1.2] text-ink sm:text-[1.75rem]">
              {recommendation.title}
            </h3>
          )}

          {byline && <p className="mt-1.5 text-sm text-ink-soft">{byline}</p>}
        </div>

        {hasActions && (
          <OwnerMenu
            onEdit={onEdit ? () => onEdit(recommendation) : undefined}
            onDelete={onDelete ? () => onDelete(recommendation) : undefined}
          />
        )}
      </div>

      {recommendation.comment?.trim() && (
        <blockquote className="mt-4 border-l-2 border-accent/35 pl-4">
          <p className="whitespace-pre-line text-[1.0625rem] leading-[1.65] text-ink">
            {recommendation.comment}
          </p>
        </blockquote>
      )}

      {extras.length > 0 && (
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 text-[13px]">
          {extras.map((e) => (
            <div key={e.label} className="flex gap-1.5">
              <dt className="text-ink-faint">{e.label}</dt>
              <dd className="text-ink-soft">{e.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <footer className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-faint">
        {recommendation.rating != null && <Rating value={recommendation.rating} size="sm" />}
        {recommendation.tags?.length > 0 && (
          <ul className="flex flex-wrap gap-x-3">
            {recommendation.tags.map((tag) => (
              <li key={tag}>#{tag}</li>
            ))}
          </ul>
        )}
        <time className="ml-auto" dateTime={recommendation.created_at}>
          {formatDate(recommendation.created_at)}
        </time>
      </footer>
    </article>
  );
}

function OwnerMenu({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Recommendation options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-10 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-sunk hover:text-ink md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lift"
        >
          {onEdit && (
            <button
              role="menuitem"
              type="button"
              className="block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-surface-sunk"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              role="menuitem"
              type="button"
              className="block w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-danger-soft"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Hairline-separated list of shelf entries. */
export function RecommendationList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-line">{children}</div>;
}
