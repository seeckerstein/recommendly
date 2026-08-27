"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle, Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { fetchMe, updateMe, type Profile } from "@/lib/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const updated = await updateMe({
        username: profile.username,
        display_name: profile.display_name,
        bio: profile.bio ?? "",
        avatar_url: profile.avatar_url,
      });
      setProfile(updated);
      setNotice("Profile saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow="Profile">Your profile</PageTitle>
        <div className="mt-8 max-w-xl">
          {loading && <p className="text-sm text-neutral-500">Loading…</p>}
          {error && !profile && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}
          {profile && (
            <Card>
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label htmlFor="display_name" className="block text-sm font-medium">Display name</label>
                  <Input id="display_name" value={profile.display_name} required
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium">Username</label>
                  <Input id="username" value={profile.username} required pattern="[a-z0-9_]{3,30}"
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
                  <p className="mt-1 text-xs text-neutral-500">Lowercase letters, numbers, underscore — 3–30 characters.</p>
                </div>
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium">Bio</label>
                  <Textarea id="bio" value={profile.bio ?? ""} maxLength={500}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="avatar_url" className="block text-sm font-medium">Avatar URL</label>
                  <Input id="avatar_url" type="url" value={profile.avatar_url ?? ""} placeholder="https://…"
                    onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value || null })} />
                </div>
                {notice && <p className="text-sm text-emerald-700">{notice}</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
              </form>
            </Card>
          )}
        </div>
      </Page>
    </AppShell>
  );
}