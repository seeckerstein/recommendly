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
  email: string;
  username?: string;
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
  const recs = (json.data ?? []) as Recommendation[];
  const { data: cats } = await supabase.from("categories").select("id, slug");
  const catMap = new Map((cats ?? []).map((c: any) => [c.id, c.slug]));
  return recs.map((r) => ({ ...r, category_id: catMap.get(r.category_id) ?? r.category_id }));
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
export async function updateRecommendation(id: string, patch: Partial<CreateRecommendationInput> & { category_id?: string }): Promise<Recommendation> {
  const res = await fetch(apiUrl(`/v1/recommendations/${id}`), {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Failed to update recommendation (${res.status})`);
  }
  const json = await res.json();
  return json.data as Recommendation;
}

export async function deleteRecommendation(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/v1/recommendations/${id}`), {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Failed to delete recommendation (${res.status})`);
  }
}
export async function getCategoryMap(): Promise<Map<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const res = await fetch(`${base}/rest/v1/categories?select=id,slug`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
  });
  if (!res.ok) throw new Error("Failed to load categories");
  const rows = await res.json();
  const map = new Map<string, string>();
  for (const row of rows) map.set(row.slug, row.id);
  return map;
}
// ---------------------------------------------------------------------------
// People / subscriptions / notifications (Checkpoint 5)
// ---------------------------------------------------------------------------

export interface PublicProfile {
  id: string;
  email: string;
  username?: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  profile_visibility: "PRIVATE" | "PUBLIC";
}

export interface UserProfile extends PublicProfile {
  relationship: "SELF" | "NOT_CONNECTED" | "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
  subscription_id?: string | null;
}

export interface SubscriptionRecord {
  id: string;
  status: string;
  subscriber_id: string;
  publisher_id: string;
  requested_at: string;
  approved_at: string | null;
  profiles: { id: string; username: string; display_name: string; avatar_url: string | null };
}

export interface AppNotification {
  id: string;
  type: string;
  actor_user_id: string;
  reference_type: string;
  reference_id: string;
  read_at: string | null;
  created_at: string;
  profiles: { id: string; username: string; display_name: string; avatar_url: string | null };
}

export async function searchUsers(q: string): Promise<PublicProfile[]> {
  const res = await fetch(apiUrl(`/v1/users?q=${encodeURIComponent(q)}`), { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const json = await res.json();
  return json.data as PublicProfile[];
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const res = await fetch(apiUrl(`/v1/users/${userId}`), { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to load user (${res.status})`);
  const json = await res.json();
  return json.data as UserProfile;
}

export async function getSubscriptions(type: string): Promise<SubscriptionRecord[]> {
  const res = await fetch(apiUrl(`/v1/subscriptions?type=${type}`), { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to load subscriptions (${res.status})`);
  const json = await res.json();
  return json.data as SubscriptionRecord[];
}

export async function requestSubscription(publisherId: string): Promise<void> {
  const res = await fetch(apiUrl("/v1/subscriptions"), {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ publisher_id: publisherId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Failed (${res.status})`);
  }
}

export async function transitionSubscription(subscriptionId: string, status: "APPROVED" | "REJECTED" | "REVOKED"): Promise<void> {
  const res = await fetch(apiUrl(`/v1/subscriptions/${subscriptionId}`), {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Failed (${res.status})`);
  }
}

export async function unsubscribeFrom(publisherId: string): Promise<void> {
  const res = await fetch(apiUrl(`/v1/subscriptions/${publisherId}/unsubscribe`), {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to unsubscribe (${res.status})`);
}

export async function getNotifications(): Promise<AppNotification[]> {
  const res = await fetch(apiUrl("/v1/notifications"), { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`);
  const json = await res.json();
  return json.data as AppNotification[];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const res = await fetch(apiUrl(`/v1/notifications/${notificationId}/read`), {
    method: "PATCH",
    headers: await getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to mark read (${res.status})`);
}