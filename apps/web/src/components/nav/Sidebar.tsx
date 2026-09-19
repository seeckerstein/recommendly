"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isNavItemActive, notificationsIcon } from "./nav-items";
import { useUnreadNotifications } from "@/lib/useNotifications";

export function Sidebar() {
  const pathname = usePathname();
  const unreadCount = useUnreadNotifications();

  const primary = navItems.filter((i) => !i.accent && !i.footer);
  const add = navItems.find((i) => i.accent);
  const footer = navItems.filter((i) => i.footer);

  return (
    <aside
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-line bg-surface px-5 py-7 md:flex"
    >
      <Link href="/" className="display px-2 text-[1.375rem] leading-none text-ink">
        Recommendly
      </Link>

      {add && (
        <Link
          href={add.href}
          className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white shadow-quiet transition-colors hover:bg-accent-ink"
        >
          {add.icon({ className: "size-4" })}
          Share a recommendation
        </Link>
      )}

      <nav className="mt-7 flex flex-1 flex-col gap-0.5">
        {primary.map((item) => {
          const active = isNavItemActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
                active
                  ? "bg-surface-sunk font-medium text-ink"
                  : "text-ink-soft hover:bg-surface-sunk/60 hover:text-ink"
              }`}
            >
              {item.icon({ className: "size-[18px] shrink-0" })}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-0.5 border-t border-line pt-4">
        <Link
          href="/notifications"
          aria-current={pathname === "/notifications" ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
            pathname === "/notifications"
              ? "bg-surface-sunk font-medium text-ink"
              : "text-ink-soft hover:bg-surface-sunk/60 hover:text-ink"
          }`}
        >
          {notificationsIcon({ className: "size-[18px] shrink-0" })}
          Activity
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} unread`}
              className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white"
            >
              {unreadCount}
            </span>
          )}
        </Link>

        {footer.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
              pathname === item.href
                ? "bg-surface-sunk font-medium text-ink"
                : "text-ink-soft hover:bg-surface-sunk/60 hover:text-ink"
            }`}
          >
            {item.icon({ className: "size-[18px] shrink-0" })}
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
