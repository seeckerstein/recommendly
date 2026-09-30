"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnreadNotifications } from "@/lib/useNotifications";
import { Logo } from "@/components/brand/Logo";
import { notificationsIcon } from "./nav-items";

export function TopBar() {
  const pathname = usePathname();
  const unreadCount = useUnreadNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/85 px-4 backdrop-blur-md md:hidden">
      <Logo size="md" />
      <div className="flex items-center">
        <Link
          href="/notifications"
          aria-label={
            unreadCount > 0 ? `Activity, ${unreadCount} unread` : "Activity and notifications"
          }
          aria-current={pathname === "/notifications" ? "page" : undefined}
          className="inline-flex size-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunk hover:text-ink"
        >
          <span className="relative">
            {notificationsIcon({ className: "size-5" })}
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent ring-2 ring-paper" />
            )}
          </span>
        </Link>
        <div ref={wrapRef} className="relative">
          <button
            type="button"
            aria-label="Account"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunk hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 5-5 8-5s6.5 1 8 5" />
            </svg>
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lift"
            >
              <Link
                href="/profile"
                role="menuitem"
                className="block px-4 py-2.5 text-sm text-ink hover:bg-surface-sunk"
                onClick={() => setOpen(false)}
              >
                Profile
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                className="block px-4 py-2.5 text-sm text-ink hover:bg-surface-sunk"
                onClick={() => setOpen(false)}
              >
                Settings
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
