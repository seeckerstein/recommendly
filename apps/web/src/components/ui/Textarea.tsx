import type { ComponentProps } from "react";

export function Textarea({ className = "", rows = 4, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      rows={rows}
      className={`w-full resize-y rounded-xl border border-line-strong bg-surface px-3.5 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint transition-colors focus:border-accent focus:outline-none ${className}`}
      {...props}
    />
  );
}
