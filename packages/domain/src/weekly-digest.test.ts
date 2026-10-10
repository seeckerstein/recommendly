import { describe, expect, it } from "vitest";
import {
  groupDigestRecommendations,
  parseWeeklyDigestRecipientIds,
  renderWeeklyDigest,
  shouldSendWeeklyDigest,
  type DigestRecommendation,
} from "../../../supabase/functions/_shared/weekly-digest";

const items: DigestRecommendation[] = [
  {
    id: "1",
    category_name: "Books",
    title: "Dune",
    comment: "A classic",
    owner_name: "Ari",
  },
  {
    id: "2",
    category_name: "Books",
    title: "Kindred",
    comment: "",
    owner_name: "Bea",
  },
  {
    id: "3",
    category_name: "Movies",
    title: "Arrival",
    comment: "Watch this",
    owner_name: "Cam",
  },
];

describe("weekly recommendation digest", () => {
  it("groups the available recommendations by category and omits empty categories", () => {
    expect(groupDigestRecommendations(items)).toEqual([
      ["Books", items.slice(0, 2)],
      ["Movies", items.slice(2)],
    ]);
  });

  it("renders content and links to the app while escaping user text", () => {
    const html = renderWeeklyDigest(
      [{ ...items[0], title: "Dune <script>" }],
      "https://www.youdlike.me/discover-recommendations",
    );
    expect(html).toContain("<h2");
    expect(html).toContain("Dune &lt;script&gt;");
    expect(html).toContain("Browse recommendations");
    expect(html).not.toContain("<script>");
    expect(html).toContain('<p style="margin:4px 0;color:#555">A classic</p>');
  });

  it.each([null, "", "  \n\t"])(
    "renders a recommendation without an empty description when its comment is %s",
    (comment) => {
      const html = renderWeeklyDigest(
        [{ ...items[0], comment }],
        "https://www.youdlike.me/discover-recommendations",
      );

      expect(html).toContain("Dune");
      expect(html).not.toContain('<p style="margin:4px 0;color:#555">');
    },
  );
  it("renders no empty category sections for an empty recommendation list", () => {
    const html = renderWeeklyDigest(
      [],
      "https://www.youdlike.me/discover-recommendations",
    );
    expect(html).not.toContain("<h2");
  });

  it("only sends when the setting is enabled and available recommendations exist", () => {
    expect(shouldSendWeeklyDigest(false, items)).toBe(false);
    expect(shouldSendWeeklyDigest(true, items)).toBe(true);
    expect(shouldSendWeeklyDigest(true, [])).toBe(false);
  });
});
describe("weekly digest recipient targeting", () => {
  it("keeps an empty scheduled request scoped to all recipients", () => {
    expect(parseWeeklyDigestRecipientIds({})).toEqual({ valid: true });
  });

  it("accepts and deduplicates an explicit recipient allowlist", () => {
    expect(
      parseWeeklyDigestRecipientIds({
        recipient_ids: [
          "159b928b-361a-4aa7-8877-5b2fd64af094",
          "159b928b-361a-4aa7-8877-5b2fd64af094",
        ],
      }),
    ).toEqual({
      valid: true,
      recipientIds: ["159b928b-361a-4aa7-8877-5b2fd64af094"],
    });
  });

  it.each([null, [], ["not-a-uuid"]])(
    "rejects invalid recipient scopes",
    (body) => {
      expect(parseWeeklyDigestRecipientIds({ recipient_ids: body })).toEqual({
        valid: false,
      });
    },
  );
});
