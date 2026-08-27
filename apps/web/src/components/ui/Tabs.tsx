import Link from "next/link";
import type { ReactNode } from "react";

export function Tabs({
  items,
  activeHref,
}: {
  items: { href: string; label: ReactNode }[];
  activeHref: string;
}) {
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-neutral-100 p-1">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={active}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-accent] ${
              active ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}