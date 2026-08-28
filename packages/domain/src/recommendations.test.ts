import { describe, expect, it } from "vitest";
import { assertCreateRecommendation } from "./recommendations.js";

describe("create recommendation contract", () => {
  it("allows a recommendation with only a category (title filled later)", () => {
    expect(() =>
      assertCreateRecommendation({ category: "book" }),
    ).not.toThrow();
  });

  it("allows incomplete optional metadata", () => {
    expect(() =>
      assertCreateRecommendation({ category: "book", comment: "Great read" }),
    ).not.toThrow();
  });

  it("allows comment-only without title", () => {
    expect(() =>
      assertCreateRecommendation({ category: "movie", comment: "Loved it" }),
    ).not.toThrow();
  });

  it("allows full metadata", () => {
    expect(() =>
      assertCreateRecommendation({
        category: "book",
        title: "The Overstory",
        comment: "Life-changing trees.",
        rating: 5,
        tags: ["fiction"],
      }),
    ).not.toThrow();
  });

  it("rejects unsupported categories", () => {
    expect(() =>
      // @ts-expect-error testing invalid category
      assertCreateRecommendation({ category: "song", title: "X" }),
    ).toThrow("Unsupported category");
  });

  it("rejects out-of-range ratings", () => {
    expect(() =>
      assertCreateRecommendation({ category: "book", rating: 6 as 1 | 2 | 3 | 4 | 5 }),
    ).toThrow("Rating must be");
  });
});
