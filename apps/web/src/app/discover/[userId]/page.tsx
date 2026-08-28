"use client";

import { use, useState, useEffect } from "react";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { getUserProfile, requestSubscription, unsubscribeFrom, type UserProfile } from "@/lib/api";

const relationshipLabels: Record<string, string> = {
  SELF: "This is you",
  NOT_CONNECTED: "",
  PENDING: "Request pending",
  APPROVED: "Connected",
  REJECTED: "Request declined",
  REVOKED: "Access removed",
};

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getUserProfile(userId).then(setProfile).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [userId]);

  async function handleAction(action: "request" | "unsubscribe") {
    if (!profile) return;
    setActionLoading(true);
    setActionError(null);
    setNotice(null);
    try {
      if (action === "request") {
        await requestSubscription(profile.id);
        setNotice("Request sent.");
      } else {
        await unsubscribeFrom(profile.id);
        setNotice("Unsubscribed.");
      }
      const updated = await getUserProfile(userId);
      setProfile(updated);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <AppShell><Page><p className="mt-8 text-sm text-neutral-500">Loading…</p></Page></AppShell>;
  }
  if (error || !profile) {
    return <AppShell><Page><p className="mt-8 text-sm text-red-600">{error ?? "User not found."}</p></Page></AppShell>;
  }

  const rel = profile.relationship;

  return (
    <AppShell>
      <Page>
        <div className="flex items-center gap-4">
          <Avatar name={profile.display_name} size={56} />
          <div>
            <PageTitle eyebrow="Profile">{profile.display_name}</PageTitle>
            <p className="text-sm text-neutral-500">@{profile.username}</p>
          </div>
        </div>
        {profile.bio && <p className="mt-4 max-w-lg text-sm text-neutral-600">{profile.bio}</p>}
        {relationshipLabels[rel] && <p className="mt-2 text-sm font-medium text-neutral-700">{relationshipLabels[rel]}</p>}

        <div className="mt-6 max-w-md">
          {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
          {notice && <p className="mb-3 text-sm text-emerald-700">{notice}</p>}
          {rel === "NOT_CONNECTED" && (
            <Button onClick={() => handleAction("request")} disabled={actionLoading} variant="accent">
              {actionLoading ? "Sending…" : "Request access"}
            </Button>
          )}
          {rel === "PENDING" && (
            <Button disabled>Request pending</Button>
          )}
          {rel === "APPROVED" && (
            <Button onClick={() => handleAction("unsubscribe")} disabled={actionLoading} variant="ghost">
              {actionLoading ? "…" : "Unsubscribe"}
            </Button>
          )}
          {rel === "REJECTED" && <Button disabled>Request declined</Button>}
          {rel === "REVOKED" && (
            <Button onClick={() => handleAction("request")} disabled={actionLoading} variant="accent">
              {actionLoading ? "Sending…" : "Request access again"}
            </Button>
          )}
        </div>
      </Page>
    </AppShell>
  );
}
