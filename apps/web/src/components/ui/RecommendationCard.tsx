import { Card } from "./Card";
import { Tag } from "./Tag";
import type { Recommendation } from "@/lib/api";

const categoryLabels: Record<string, string> = {
  book: "Book",
  movie: "Movie",
  restaurant: "Restaurant",
};

export function RecommendationCard({
  recommendation,
  categoryName,
}: {
  recommendation: Recommendation;
  categoryName?: string;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-neutral-400">
          {categoryName ?? categoryLabels[recommendation.category_id] ?? recommendation.category_id}
        </span>
        <time className="text-xs text-neutral-400" dateTime={recommendation.created_at}>
          {new Date(recommendation.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
        </time>
      </div>

      {recommendation.title && (
        <h3 className="text-lg font-semibold leading-snug text-neutral-900">{recommendation.title}</h3>
      )}

      <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{recommendation.comment}</p>

      {(recommendation.rating || recommendation.tags?.length > 0) && (
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {recommendation.rating && (
            <span aria-label={`Rated ${recommendation.rating} out of 5`} className="text-orange-700">
              {"★".repeat(recommendation.rating)}<span className="opacity-30">{"★".repeat(5 - recommendation.rating)}</span>
            </span>
          )}
          {recommendation.tags.map((tag) => <Tag key={tag}>#{tag}</Tag>)}
        </div>
      )}
    </Card>
  );
}