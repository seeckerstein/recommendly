"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle, SectionHeading } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelative } from "@/lib/recommendation-display";
import {
  getNotifications,
  markNotificationRead,
  transitionSubscription,
  type AppNotification,
} from "@/lib/api";

const typeLabels: Record<string, string> = {
  subscription_request: "asked for access to your shelf",
  subscription_approved: "approved your request",
  subscription_rejected: "declined your request",
  access_revoked: "removed your access",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getNotifications()
      .then(setNotifications)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function markLocallyRead(id: string) {
    setNotifications(
      (prev) =>
        prev?.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)) ??
        null,
    );
  }

  async function handleTransition(n: AppNotification, status: "APPROVED" | "REJECTED") {
    setActionLoading(n.id + status);
    try {
      await transitionSubscription(n.reference_id, status);
      await markNotificationRead(n.id);
      markLocallyRead(n.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkRead(n: AppNotification) {
    setActionLoading(n.id + "read");
    try {
      await markNotificationRead(n.id);
      markLocallyRead(n.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  const items = notifications ?? [];
  const unread = items.filter((n) => !n.read_at);
  const read = items.filter((n) => n.read_at);

  function row(n: AppNotification, isUnread: boolean) {
    const isRequest = n.type === "subscription_request" && n.reference_type === "subscription";
    return (
      <li key={n.id} className={`flex gap-4 py-5 ${isUnread ? "" : "opacity-70"}`}>
        <Avatar
          name={n.profiles?.display_name ?? "User"}
          src={n.profiles?.avatar_url ?? null}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug text-ink">
            <Link
              href={`/discover/${n.actor_user_id}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {n.profiles?.display_name ?? "Someone"}
            </Link>{" "}
            <span className="text-ink-soft">{typeLabels[n.type] ?? n.type}</span>
          </p>
          <time dateTime={n.created_at} className="mt-1 block text-xs text-ink-faint">
            {formatRelative(n.created_at)}
          </time>

          {isRequest && isUnread && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="accent"
                onClick={() => handleTransition(n, "APPROVED")}
                disabled={actionLoading === n.id + "APPROVED"}
              >
                {actionLoading === n.id + "APPROVED" ? "…" : "Approve"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleTransition(n, "REJECTED")}
                disabled={actionLoading === n.id + "REJECTED"}
              >
                {actionLoading === n.id + "REJECTED" ? "…" : "Decline"}
              </Button>
            </div>
          )}

          {!isRequest && isUnread && (
            <button
              type="button"
              onClick={() => handleMarkRead(n)}
              disabled={actionLoading === n.id + "read"}
              className="mt-2 text-xs text-ink-faint underline underline-offset-2 hover:text-ink"
            >
              Mark as read
            </button>
          )}
        </div>
        {isUnread && (
          <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-accent" />
        )}
      </li>
    );
  }

  return (
    <AppShell>
      <Page>
        <PageTitle
          eyebrow="Activity"
          lede={
            unread.length > 0
              ? `${unread.length} thing${unread.length > 1 ? "s" : ""} needs your attention.`
              : "Requests and replies about access to shelves."
          }
        >
          Activity
        </PageTitle>

        <div className="mt-10 space-y-10">
          {loading && (
            <div className="space-y-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <ErrorState message={error} onRetry={load} />}

          {!loading && !error && items.length === 0 && (
            <EmptyState
              title="Nothing yet"
              description="When someone asks for access to your shelf, or replies to your request, it lands here."
            />
          )}

          {unread.length > 0 && (
            <section>
              <SectionHeading>Needs you</SectionHeading>
              <ul className="mt-2 divide-y divide-line">
                {unread.map((n) => row(n, true))}
              </ul>
            </section>
          )}

          {read.length > 0 && (
            <section>
              <SectionHeading>Earlier</SectionHeading>
              <ul className="mt-2 divide-y divide-line">
                {read.map((n) => row(n, false))}
              </ul>
            </section>
          )}
        </div>
      </Page>
    </AppShell>
  );
}
