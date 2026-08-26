export const categorySlugs = ["book", "movie", "restaurant"] as const;
export type CategorySlug = (typeof categorySlugs)[number];

export interface CreateRecommendationInput {
  category: CategorySlug;
  comment: string;
  title?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export function assertCreateRecommendation(
  input: CreateRecommendationInput,
): void {
  if (!categorySlugs.includes(input.category))
    throw new Error("Unsupported category");
  if (!input.comment.trim())
    throw new Error("A recommendation comment is required");
  if (input.rating !== undefined && (input.rating < 1 || input.rating > 5))
    throw new Error("Rating must be 1 to 5");
}
