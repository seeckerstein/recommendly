import type { CategorySlug } from "recommendation-domain";

/**
 * Presentation-only vocabulary for recommendations. This mirrors the metadata
 * keys the existing API already stores — it does not add or rename any field.
 */

export const categoryLabels: Record<string, string> = {
  book: "Book",
  movie: "Movie",
  restaurant: "Restaurant",
  series: "Series",
  other: "Other",
};

export const titleLabels: Record<CategorySlug, string> = {
  book: "Book title",
  movie: "Film title",
  restaurant: "Restaurant name",
  series: "Series title",
  other: "Title",
};

export const titlePlaceholders: Record<CategorySlug, string> = {
  book: "e.g. The Overstory",
  movie: "e.g. Past Lives",
  restaurant: "e.g. Kronenhalle",
  series: "e.g. The Rookie",
  other: "e.g. Search Engine (podcast)",
};

export const commentPrompts: Record<CategorySlug, string> = {
  book: "Why is this worth someone's reading time?",
  movie: "Why should someone give this two hours?",
  restaurant: "What makes it worth the trip?",
  series: "Why is this worth starting?",
  other: "Why do you recommend it?",
};

export type MetaField = { key: string; label: string; placeholder?: string };

export const metadataFields: Record<CategorySlug, MetaField[]> = {
  book: [
    { key: "author", label: "Author", placeholder: "e.g. Richard Powers" },
    { key: "genre", label: "Genre", placeholder: "e.g. Literary fiction" },
  ],
  movie: [
    { key: "director", label: "Director", placeholder: "e.g. Denis Villeneuve" },
    { key: "genre", label: "Genre", placeholder: "e.g. Science fiction" },
    { key: "year", label: "Year", placeholder: "e.g. 2021" },
    { key: "platform", label: "Where to watch", placeholder: "e.g. Netflix" },
  ],
  restaurant: [
    { key: "location", label: "Location", placeholder: "City or neighbourhood" },
    { key: "cuisine", label: "Cuisine", placeholder: "e.g. Thai" },
  ],
  series: [
    { key: "creator", label: "Creator", placeholder: "e.g. Alexi Hawley" },
    { key: "seasons", label: "Seasons", placeholder: "e.g. 4" },
    { key: "platform", label: "Where to watch", placeholder: "e.g. Netflix" },
    { key: "genre", label: "Genre", placeholder: "e.g. Crime drama" },
    { key: "year", label: "Year", placeholder: "e.g. 2024" },
    { key: "status", label: "Status", placeholder: "e.g. ongoing, ended" },
  ],
  other: [
    { key: "type", label: "Type", placeholder: "e.g. podcast, course, place" },
    { key: "details", label: "Details", placeholder: "Any extra details" },
  ],
};

/**
 * The one or two metadata values worth showing inline under a title
 * (e.g. "Richard Powers · Literary fiction"). Everything else stays folded away.
 */
const bylineKeys: Record<string, string[]> = {
  book: ["author", "genre"],
  movie: ["director", "year"],
  restaurant: ["location", "cuisine"],
  series: ["creator", "seasons"],
  other: ["type"],
};

export function metadataByline(
  category: string,
  metadata: Record<string, unknown> | undefined,
): string | null {
  const keys = bylineKeys[category] ?? [];
  const parts = keys
    .map((k) => metadata?.[k])
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => String(v).trim());
  if (parts.length === 0) return null;
  const [first, second] = parts;
  if (category === "series" && second) return `${first} · ${second} seasons`;
  return parts.slice(0, 2).join(" · ");
}

/** Remaining metadata, excluding whatever already appears in the byline. */
export function secondaryMetadata(
  category: string,
  metadata: Record<string, unknown> | undefined,
): { label: string; value: string }[] {
  const shown = new Set(bylineKeys[category] ?? []);
  const fields = metadataFields[category as CategorySlug] ?? [];
  return fields
    .filter((f) => !shown.has(f.key))
    .map((f) => ({ label: f.label, value: String(metadata?.[f.key] ?? "").trim() }))
    .filter((f) => f.value !== "");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}
