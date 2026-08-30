"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/nav/AppShell";
import { Page, PageTitle, Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { searchUsers, type PublicProfile } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProfile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const users = await searchUsers(query.trim());
      setResults(users);
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
        <PageTitle eyebrow="Explore">Find someone</PageTitle>
        <p className="mt-2 text-sm text-neutral-600">Search by name or email</p>
        <form onSubmit={handleSearch} className="mt-6 max-w-md">
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. jane@example.com" type="text" />
            <Button type="submit" disabled={loading || !query.trim()}>Search</Button>
          </div>
        </form>

        {loading && <p className="mt-6 text-sm text-neutral-500">Searching…</p>}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
        {results && results.length === 0 && !loading && (
          <div className="mt-8">
            <EmptyState icon="✦" title="No results" description={`No people found matching "${query}".`} />
          </div>
        )}
        {results && results.length > 0 && (
          <div className="mt-6 space-y-3">
            {results.map((u) => (
              <Link key={u.id} href={`/discover/${u.id}`} className="block">
                <Card className="flex items-center gap-4 p-4 transition hover:bg-neutral-50">
                  <Avatar name={u.display_name} size={44} />
                  <div>
                    <p className="font-medium text-neutral-900">{u.display_name}</p>
                    <p className="text-sm text-neutral-500">{u.email}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
        {!results && !loading && !error && (
          <div className="mt-8">
            <EmptyState icon="✦" title="Find someone" description="Search for people by their email address to discover recommendations." />
          </div>
        )}
      </Page>
    </AppShell>
  );
}
