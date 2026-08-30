"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { useUnreadNotifications } from "@/lib/useNotifications";
import { getNotifications, markNotificationRead, transitionSubscription, type AppNotification } from "@/lib/api";

const typeLabels: Record<string, string> = {
  subscription_request: "wants to connect with you",
  subscription_approved: "approved your connection request",
  subscription_rejected: "declined your connection request",
  access_revoked: "removed your access",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    getNotifications().then(setNotifications).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function handleTransition(notification: AppNotification, status: "APPROVED" | "REJECTED") {
    setActionLoading(notification.id + status);
    try {
      await transitionSubscription(notification.reference_id, status);
      // Mark read after action
      await markNotificationRead(notification.id);
      setNotifications((prev) => prev?.map((n) => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n) ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkRead(notification: AppNotification) {
    setActionLoading(notification.id + "read");
    try {
      await markNotificationRead(notification.id);
      setNotifications((prev) => prev?.map((n) => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n) ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <AppShell><Page><p className="mt-8 text-sm text-neutral-500">Loading…</p></Page></AppShell>;
  }
  if (error && !notifications) {
    return <AppShell><Page><p className="mt-8 text-sm text-red-600">{error}</p></Page></AppShell>;
  }

  const items = notifications ?? [];
  const pendingRequests = items.filter((n) => n.type === "subscription_request" && !n.read_at);
  const unread = items.filter((n) => !n.read_at);
  const read = items.filter((n) => n.read_at);

  return (
    <AppShell>
      <Page>
        <PageTitle eyebrow="Notifications">Activity</PageTitle>
        {pendingRequests.length > 0 && (
          <p className="mt-2 text-sm font-semibold text-red-600">{pendingRequests.length} pending request{pendingRequests.length > 1 ? "s" : ""}</p>
        )}
        {items.length === 0 && (
          <div className="mt-8">
            <Card><p className="text-sm text-neutral-500">No notifications yet.</p></Card>
          </div>
        )}
        {unread.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900">Unread</h2>
            {unread.map((n) => (
              <Card key={n.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={n.profiles?.display_name ?? "User"} size={36} />
                  <div className="flex-1">
                    <p className="text-sm">
                      <Link href={`/discover/${n.actor_user_id}`} className="font-medium hover:underline">{n.profiles?.display_name ?? "Someone"}</Link>
                      {" "}{typeLabels[n.type] ?? n.type}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">{new Date(n.created_at).toLocaleString()}</p>
                    {n.type === "subscription_request" && n.reference_type === "subscription" && (
                      <div className="mt-2 flex gap-2">
                        <Button onClick={() => handleTransition(n, "APPROVED")} disabled={actionLoading === n.id + "APPROVED"}>
                          {actionLoading === n.id + "APPROVED" ? "…" : "Approve"}
                        </Button>
                        <Button variant="ghost" onClick={() => handleTransition(n, "REJECTED")} disabled={actionLoading === n.id + "REJECTED"}>
                          {actionLoading === n.id + "REJECTED" ? "…" : "Decline"}
                        </Button>
                      </div>
                    )}
                    {n.type !== "subscription_request" && !n.read_at && (
                      <button type="button" onClick={() => handleMarkRead(n)} className="mt-2 text-xs text-neutral-500 underline">
                        Mark as read
                      </button>
                    )}
                  </div>
                  <span className="h-2 w-2 rounded-full bg-orange-600" />
                </div>
              </Card>
            ))}
          </div>
        )}
        {read.length > 0 && (
          <div className="mt-8 space-y-3">
            <h2 className="text-sm font-semibold text-neutral-500">Earlier</h2>
            {read.map((n) => (
              <Card key={n.id} className="p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <Avatar name={n.profiles?.display_name ?? "User"} size={36} />
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{n.profiles?.display_name ?? "Someone"}</span>
                      {" "}{typeLabels[n.type] ?? n.type}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {items.length === 0 && !loading && (
          <div className="mt-8">
            <p className="text-sm text-neutral-500">No notifications yet. When someone requests access to your recommendations or responds to your request, you&apos;ll see it here.</p>
          </div>
        )}
      </Page>
    </AppShell>
  );
}
