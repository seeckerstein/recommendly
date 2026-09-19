"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isNavItemActive } from "./nav-items";

const mobileItems = navItems.filter((item) => item.mobile);

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-flow-col auto-cols-fr border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {mobileItems.map((item) => {
        const active = isNavItemActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            aria-label={item.accent ? "Share a recommendation" : item.label}
            className={`flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 text-[10.5px] font-medium transition-colors ${
              item.accent ? "text-accent" : active ? "text-ink" : "text-ink-faint"
            }`}
          >
            <span
              className={`inline-flex items-center justify-center ${
                item.accent
                  ? "size-9 rounded-full bg-accent text-white shadow-quiet"
                  : "size-6"
              }`}
            >
              {item.icon({ className: item.accent ? "size-5" : "size-[22px]" })}
            </span>
            {!item.accent && (item.shortLabel ?? item.label)}
          </Link>
        );
      })}
    </nav>
  );
}
