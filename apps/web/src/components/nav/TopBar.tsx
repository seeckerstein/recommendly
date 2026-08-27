"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 md:hidden">
      <Link
        href="/"
        className="text-base font-semibold tracking-tight text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-accent]"
      >
        Recommendly
      </Link>
      <Link
        href="/notifications"
        aria-label="Activity and notifications"
        aria-current={pathname === "/notifications" ? "page" : undefined}
        className="inline-flex size-10 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-accent]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></svg>
      </Link>
    </header>
  );
}