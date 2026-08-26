import { describe, expect, it } from "vitest";
import { assertCreateRecommendation } from "./recommendations.js";

describe("create recommendation contract", () => {
  it("allows incomplete optional metadata", () => {
    expect(() =>
      assertCreateRecommendation({ category: "book", comment: "Great read" }),
    ).not.toThrow();
  });
  it("requires a comment", () => {
    expect(() =>
      assertCreateRecommendation({ category: "movie", comment: " " }),
    ).toThrow("required");
  });
});
