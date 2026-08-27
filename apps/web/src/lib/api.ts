import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { assertCreateRecommendation, type CreateRecommendationInput } from "recommendation-domain";

const supabase = createSupabaseBrowserClient();

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  return `${base.replace(/\/$/, "")}/functions/v1/api${path}`;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  profile_visibility: "PRIVATE" | "PUBLIC";
}

export async function fetchMe(): Promise<Profile> {
  const res = await fetch(apiUrl("/v1/me"), { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
  const json = await res.json();
  return json.data as Profile;
}

export async function updateMe(patch: Partial<Profile>): Promise<Profile> {
  const res = await fetch(apiUrl("/v1/me"), {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Failed to update profile (${res.status})`);
  }
  const json = await res.json();
  return json.data as Profile;
}

export interface Recommendation {
  id: string;
  category_id: string;
  title: string | null;
  comment: string;
  rating: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function fetchMyRecommendations(): Promise<Recommendation[]> {
  const res = await fetch(apiUrl("/v1/recommendations?scope=mine"), {
    headers: await getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load recommendations (${res.status})`);
  const json = await res.json();
  return (json.data ?? []) as Recommendation[];
}

export async function createRecommendation(input: CreateRecommendationInput): Promise<Recommendation> {
  assertCreateRecommendation(input);
  const res = await fetch(apiUrl("/v1/recommendations"), {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Failed to create recommendation (${res.status})`);
  }
  const json = await res.json();
  return json.data as Recommendation;
}