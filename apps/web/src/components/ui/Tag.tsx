import type { ComponentProps } from "react";

export function Tag({ className = "", ...props }: ComponentProps<"span">) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-600 ${className}`}
      {...props}
    />
  );
}