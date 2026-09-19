"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { Input, Field } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { fetchMe, updateMe, type Profile } from "@/lib/api";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
    fetchMe()
      .then(setProfile)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateMe({
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

  const bioLength = profile?.bio?.length ?? 0;

  return (
    <AppShell>
      <Page>
        <PageTitle
          eyebrow="Profile"
          lede="This is what people see when they find you and when your recommendations reach them."
        >
          Your profile
        </PageTitle>

        <div className="mt-10">
          {loading && (
            <div className="space-y-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          )}

          {error && !profile && !loading && <ErrorState message={error} />}

          {profile && (
            <form onSubmit={handleSave} className="space-y-8">
              <div className="flex items-center gap-4">
                <Avatar
                  name={profile.display_name}
                  src={profile.avatar_url}
                  size={72}
                />
                <div className="min-w-0">
                  <p className="display text-xl leading-tight text-ink">
                    {profile.display_name || "Your name"}
                  </p>
                  <p className="truncate text-sm text-ink-faint">{email ?? profile.email}</p>
                </div>
              </div>

              <Field
                htmlFor="display_name"
                label="Display name"
                hint="How you appear in other people's activity and recommendations."
              >
                <Input
                  id="display_name"
                  value={profile.display_name}
                  required
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                />
              </Field>

              <Field
                htmlFor="bio"
                label="Bio"
                optional
                hint={`${bioLength}/500 — a line about what you tend to recommend.`}
              >
                <Textarea
                  id="bio"
                  rows={4}
                  value={profile.bio ?? ""}
                  maxLength={500}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </Field>

              <Field htmlFor="avatar_url" label="Photo link" optional>
                <Input
                  id="avatar_url"
                  type="url"
                  value={profile.avatar_url ?? ""}
                  placeholder="https://…"
                  onChange={(e) =>
                    setProfile({ ...profile, avatar_url: e.target.value || null })
                  }
                />
              </Field>

              <Field htmlFor="email" label="Email" hint="Your email is your account identity and can't be changed here.">
                <Input id="email" type="email" value={email ?? ""} disabled />
              </Field>

              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
              {notice && (
                <p role="status" className="text-sm text-positive">
                  {notice}
                </p>
              )}

              <Button type="submit" variant="accent" size="lg" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          )}
        </div>
      </Page>
    </AppShell>
  );
}
