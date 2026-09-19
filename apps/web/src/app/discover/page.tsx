"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { searchUsers, type PublicProfile } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [results, setResults] = useState<PublicProfile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(q);
    try {
      setResults(await searchUsers(q));
    } catch (err) {
      setError((err as Error).message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <Page>
        <PageTitle
          eyebrow="Find people"
          lede="Search by name or email address. Their shelf stays private until they approve you."
        >
          Who do you trust?
        </PageTitle>

        <form onSubmit={handleSearch} className="mt-8 flex gap-2" role="search">
          <label htmlFor="people-search" className="sr-only">
            Search people by name or email
          </label>
          <Input
            id="people-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email"
            type="search"
            autoComplete="off"
          />
          <Button type="submit" disabled={loading || !query.trim()} className="shrink-0">
            {loading ? "Searching…" : "Search"}
          </Button>
        </form>

        <div className="mt-10">
          {loading && (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-11 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !loading && <ErrorState title="Search failed" message={error} />}

          {!loading && !error && results?.length === 0 && (
            <EmptyState
              title="Nobody matched that"
              description={`No one found for “${searched}”. Try their full email address.`}
            />
          )}

          {!loading && !error && results && results.length > 0 && (
            <ul className="divide-y divide-line border-y border-line">
              {results.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/discover/${u.id}`}
                    className="group flex items-center gap-4 py-4 transition-colors hover:bg-surface-sunk/40"
                  >
                    <Avatar name={u.display_name} src={u.avatar_url} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{u.display_name}</p>
                      <p className="truncate text-sm text-ink-faint">{u.email}</p>
                    </div>
                    <span
                      aria-hidden
                      className="text-accent transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!loading && !error && !results && (
            <EmptyState
              title="Start with someone you know"
              description="Recommendly only works between people who've agreed to share — search for a friend and ask for access."
            />
          )}
        </div>
      </Page>
    </AppShell>
  );
}
