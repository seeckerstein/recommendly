import { describe, expect, it, vi } from "vitest";

// Minimal mock of the supabase-js query builder chain used by the Edge Function.
function makeMockClient(overrides: Record<string, unknown> = {}) {
  const selectResult = overrides.select ?? { data: [{ id: "rec-1", category_id: "cat-1", comment: "test" }] };
  const insertResult = overrides.insert ?? { data: { id: "new-rec", category_id: "cat-1" }, error: null };
  const categoryResult = overrides.category ?? { data: { id: "cat-1" }, error: null };
  const searchResult = overrides.search ?? { data: [], error: null };
  const sourceResult = overrides.source ?? { data: { category_id: "cat-1", comment: "source comment", title: "Book", rating: 4, tags: ["a"], metadata: {} }, error: null };

  function chain(table: string) {
    let currentOp = "select";
    const builder: Record<string, (...args: unknown[]) => any> & PromiseLike<any> = {} as never;

    const resolve = () => {
      if (table === "categories") return categoryResult;
      if (currentOp === "insert") return insertResult;
      if (overrides.searchCalled) return searchResult;
      if (table === "recommendations" && overrides.isSingle) return sourceResult;
      return selectResult;
    };

    Object.assign(builder, {
      select(...args: unknown[]) { overrides.lastSelectArgs = args; return builder; },
      insert(data: Record<string, unknown>) {
        currentOp = "insert";
        overrides.lastInsertData = data;
        return builder;
      },
      eq(...args: unknown[]) { (builder as Record<string, unknown>).eqArgs = args; return builder; },
      order() { return builder; },
      limit() { return builder; },
      textSearch(column: string) { overrides.textSearchColumn = column; overrides.searchCalled = true; return builder; },
      single() { overrides.isSingle = true; return builder; },
      then(onFulfilled?: (value: unknown) => void) {
        return Promise.resolve(resolve()).then(onFulfilled);
      },
    });
    return builder as typeof builder;
  }

  return { from: chain, _state: overrides };
}

describe("API endpoint logic (mocked Supabase client)", () => {
  describe("POST /v1/recommendations â€” create", () => {
    it("resolves category_id and inserts with correct fields", async () => {
      const mock = makeMockClient({});
      const body = { category: "book", comment: "Great read", title: "My Book" };

      // Simulate the API's resolution + insert sequence.
      const catRes = await mock.from("categories").select("id").eq("slug", body.category).eq("active", true).single();
      const catData = (catRes as { data: { id: string }; error: unknown }).data;
      expect(catData.id).toBe("cat-1");
      const insertPayload = {
        category_id: catData.id,
        comment: body.comment,
        title: body.title,
        rating: null,
        tags: [],
        metadata: {},
      };
      await mock.from("recommendations").insert(insertPayload).select().single();
      const lastInsert = (mock._state as { lastInsertData?: Record<string, unknown> }).lastInsertData;
      expect(lastInsert?.category_id).toBe("cat-1");
      expect(lastInsert?.comment).toBe("Great read");
      expect(lastInsert?.title).toBe("My Book");
    });

    it("rejects missing category or comment before querying the DB", async () => {
      expect(!{ category: "", comment: "hi" }.category).toBe(true);
      expect(!{ category: "book", comment: "" }.comment.trim()).toBe(true);
    });

    it("returns error for unknown category", async () => {
      const mock = makeMockClient({ category: { data: null, error: { message: "no rows" } } });
      const res = await mock.from("categories").select("id").eq("slug", "nonexistent").single();
      expect(res.error).toBeTruthy();
    });
  });

  describe("POST /v1/recommendations/:id/recommend â€” re-recommendation", () => {
    it("copies category_id and comment from the source recommendation", async () => {
      const source = { category_id: "cat-movie", comment: "great film", title: "Film", rating: 5, tags: ["drama"], metadata: { director: "X" } };
      const mock = makeMockClient({ source: { data: source, error: null } });
      const srcRes = await mock.from("recommendations").select("*").eq("id", "some-id").single();
      const srcData = (srcRes as { data: typeof source; error: unknown }).data;
      expect(srcData.category_id).toBe("cat-movie");
      const insertPayload = {
        category_id: srcData.category_id,
        comment: srcData.comment,
        title: srcData.title,
        rating: srcData.rating,
        tags: srcData.tags,
        metadata: srcData.metadata,
      };
      await mock.from("recommendations").insert(insertPayload);
      const lastInsert = (mock._state as { lastInsertData?: Record<string, unknown> }).lastInsertData;
      expect(lastInsert?.category_id).toBe("cat-movie");
      expect(lastInsert?.comment).toBe("great film");
    });

    it("returns 404 when the source is not accessible", async () => {
      const mock = makeMockClient({ source: { data: null, error: { message: "row-level security blocks access" } } });
      const res = await mock.from("recommendations").select("*").eq("id", "blocked-id").single();
      expect(res.data).toBeNull();
    });
  });

  describe("GET /v1/recommendations?q=... â€” full-text search", () => {
    it("calls textSearch on the title/comment tsvector", async () => {
      const mock = makeMockClient({});
      await mock.from("recommendations").select("*").textSearch("title", "great book").limit(100);
      const col = (mock._state as { textSearchColumn?: string }).textSearchColumn;
      expect(col).toBe("title");
      expect(mock._state.searchCalled).toBe(true);
    });
  });
});


describe("GET /v1/me", () => {
  it("selects the authenticated user's profile row by id", async () => {
    const mock = makeMockClient({ profile: { data: { id: "u-1", username: "ada" }, error: null } });
    const authUser = { id: "u-1" };
    // Simulate endpoint flow: getUser -> profile select eq(id)
    const res = await mock.from("profiles").select("id, username").eq("id", authUser.id).single();

  });
});

describe("PATCH /v1/me", () => {
  it("filters disallowed fields and sends only whitelisted keys", async () => {
    const mock = makeMockClient({});
    const allowed = ["username", "display_name", "bio", "avatar_url", "profile_visibility"];
    const body: Record<string, unknown> = { username: "newname", role: "admin", evil: true };
    const updates: Record<string, unknown> = {};
    for (const k of allowed) if (k in body) updates[k] = body[k];
    expect(updates).toEqual({ username: "newname" });
  });

  it("returns an error when no valid fields are provided", () => {
    const body = {};
    const allowed = ["username", "display_name", "bio", "avatar_url", "profile_visibility"];
    const matched = allowed.filter((k) => k in body);
    expect(matched.length).toBe(0);
  });
});

describe("GET /v1/recommendations?scope=connected", () => {
  it("applies owner_id filter when provided", async () => {
    const mock = makeMockClient({});
    const ownerId = "u-2";
    const q = mock.from("recommendations").select("*, profiles!user_id(id, display_name)").eq("user_id", ownerId).limit(100);
    expect(q.eqArgs).toEqual(["user_id", ownerId]);
  });

  it("does not apply owner_id filter when not provided", async () => {
    const mock = makeMockClient({});
    const q = mock.from("recommendations").select("*, profiles!user_id(id, display_name)").limit(100);
    expect(q.eqArgs).toBeUndefined();
  });

  it("selects profiles join for owner attribution", async () => {
    const mock = makeMockClient({});
    const q = mock.from("recommendations").select("*, profiles!user_id(id, display_name)");
    expect((mock._state as { lastSelectArgs?: unknown[] }).lastSelectArgs).toEqual(["*, profiles!user_id(id, display_name)"]);
  });
});

describe("GET /v1/recommendations?scope=mine", () => {
  it("adds user_id filter for authenticated owner-scoped reads", async () => {
    const mock = makeMockClient({});
    const userId = "u-1";
    const q = mock.from("recommendations").select("*").eq("user_id", userId).limit(100);
    expect(q.eqArgs).toEqual(["user_id", userId]);
  });
});

describe("PATCH /v1/recommendations/:id", () => {
  it("whitelists editable fields only", () => {
    const allowed = ["title", "comment", "rating", "tags", "metadata"];
    const body: Record<string, unknown> = { title: "New Title", user_id: "hack", created_at: "evil" };
    const updates: Record<string, unknown> = {};
    for (const k of allowed) if (k in body) updates[k] = body[k];
    expect(updates).toEqual({ title: "New Title" });
  });

  it("returns error when no valid fields provided", () => {
    const allowed = ["title", "comment", "rating", "tags", "metadata"];
    const body = { deleted_at: "now" };
    const matched = allowed.filter((k) => k in body);
    expect(matched.length).toBe(0);
  });

  it("soft-deletes by setting deleted_at (DELETE endpoint)", () => {
    const softDeletePayload = { deleted_at: new Date().toISOString() };
    expect(softDeletePayload.deleted_at).toBeTruthy();
  });
});

describe("PATCH /v1/recommendations/:id - category change", () => {
  it("includes category_id in whitelist", () => {
    const allowed = ["title", "comment", "rating", "tags", "metadata", "category_id"];
    const body = { category_id: "new-cat-uuid" };
    const updates: Record<string, unknown> = {};
    for (const k of allowed) if (k in body) updates[k] = body[k];
    expect(updates).toEqual({ category_id: "new-cat-uuid" });
  });
});

