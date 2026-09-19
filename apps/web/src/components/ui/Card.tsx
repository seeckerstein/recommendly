import type { ComponentProps, ReactNode } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-line bg-surface shadow-quiet ${className}`}
      {...props}
    />
  );
}

/** Page wrapper — a comfortable reading measure, not a dashboard canvas. */
export function Page({
  className = "",
  width = "reading",
  ...props
}: ComponentProps<"div"> & { width?: "reading" | "wide" }) {
  const measure = width === "wide" ? "max-w-5xl" : "max-w-2xl";
  return (
    <div
      className={`mx-auto w-full ${measure} px-5 pb-24 pt-8 sm:px-6 md:pb-20 md:pt-14 ${className}`}
      {...props}
    />
  );
}

export function PageTitle({
  eyebrow,
  children,
  lede,
  action,
}: {
  eyebrow?: string;
  children: ReactNode;
  lede?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            {eyebrow}
          </p>
        )}
        <h1 className="display mt-2 text-[2rem] font-normal leading-[1.1] text-ink sm:text-[2.5rem]">
          {children}
        </h1>
        {lede && (
          <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-soft">{lede}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function SectionHeading({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        {children}
      </h2>
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
    </div>
  );
}
