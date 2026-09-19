import type { ReactNode } from "react";

/** Quiet inline tag. Deliberately unfilled — this product avoids badge soup. */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="text-xs text-ink-faint">{children}</span>;
}
