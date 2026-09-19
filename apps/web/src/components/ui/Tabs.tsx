import Link from "next/link";
import type { ReactNode } from "react";

/** Underlined editorial tabs — no pill chrome. */
export function Tabs({
  items,
  activeHref,
}: {
  items: { href: string; label: ReactNode }[];
  activeHref: string;
}) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-line">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={active}
            className={`-mb-px border-b-2 pb-3 text-sm transition-colors ${
              active
                ? "border-accent font-medium text-ink"
                : "border-transparent text-ink-faint hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
