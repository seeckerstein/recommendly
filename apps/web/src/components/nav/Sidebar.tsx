"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { useUnreadNotifications } from "@/lib/useNotifications";

export function Sidebar() {
  const pathname = usePathname();
  const unreadCount = useUnreadNotifications();

  return (
    <aside
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-neutral-200 bg-white px-4 py-6 md:flex"
    >
      <Link
        href="/"
        className="mb-8 rounded-md px-2 text-lg font-semibold tracking-tight text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-accent]"
      >
        Recommendly
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-accent] ${
                item.accent
                  ? "mt-2 bg-[--color-accent] text-white hover:brightness-95"
                  : active
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              {item.icon({ className: "size-4 shrink-0" })}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/notifications"
        aria-current={pathname === "/notifications" ? "page" : undefined}
        className={`mt-6 flex items-center gap-3 rounded-lg border-t border-neutral-200 px-3 pt-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-accent] ${
          pathname === "/notifications"
            ? "text-[--color-accent]"
            : "text-neutral-500 hover:text-neutral-900"
        }`}
      >
        {navItems[0].icon({ className: "size-4" })}
        Activity
        {unreadCount > 0 && <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">{unreadCount}</span>}
      </Link>
    </aside>
  );
}