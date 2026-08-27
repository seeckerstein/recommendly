"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";

const mobileItems = navItems.filter((item) => item.mobile);

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-flow-col auto-cols-fr border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {mobileItems.map((item) => {
        const active = pathname === item.href;
        const accent = item.accent;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            aria-label={item.accent ? `Add a new recommendation` : item.label}
            className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-accent] ${
              accent
                ? "text-[--color-accent]"
                : active
                  ? "text-neutral-900"
                  : "text-neutral-500"
            }`}
          >
            <span
              className={`inline-flex size-7 items-center justify-center rounded-full ${
                accent ? "bg-[--color-accent] text-white shadow-sm" : ""
              }`}
            >
              {item.icon({ className: "size-5" })}
            </span>
            {!accent && (item.shortLabel ?? item.label)}
          </Link>
        );
      })}
    </nav>
  );
}