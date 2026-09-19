import type { ComponentProps, ReactNode } from "react";

const field =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-3 text-[15px] text-ink placeholder:text-ink-faint transition-colors focus:border-accent focus:outline-none disabled:bg-surface-sunk disabled:text-ink-faint";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${field} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${field} appearance-none pr-9 ${className}`} {...props} />;
}

/** Label + optional hint + error, wired to the control via htmlFor. */
export function Field({
  htmlFor,
  label,
  hint,
  optional,
  children,
}: {
  htmlFor: string;
  label: ReactNode;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-sm font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-ink-faint">optional</span>}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-ink-faint">{hint}</p>}
    </div>
  );
}
