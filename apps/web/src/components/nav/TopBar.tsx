"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnreadNotifications } from "@/lib/useNotifications";
import { notificationsIcon } from "./nav-items";

export function TopBar() {
  const pathname = usePathname();
  const unreadCount = useUnreadNotifications();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/85 px-4 backdrop-blur-md md:hidden">
      <Link href="/" className="display text-[1.125rem] leading-none text-ink">
        Recommendly
      </Link>
      <Link
        href="/notifications"
        aria-label={
          unreadCount > 0 ? `Activity, ${unreadCount} unread` : "Activity and notifications"
        }
        aria-current={pathname === "/notifications" ? "page" : undefined}
        className="-mr-1.5 inline-flex size-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunk hover:text-ink"
      >
        <span className="relative">
          {notificationsIcon({ className: "size-5" })}
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent ring-2 ring-paper" />
          )}
        </span>
      </Link>
    </header>
  );
}
