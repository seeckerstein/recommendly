import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center sm:px-10">
      <h2 className="display text-[1.375rem] leading-snug text-ink">{title}</h2>
      {description && (
        <p className="mx-auto mt-2.5 max-w-sm text-[15px] leading-relaxed text-ink-soft">
          {description}
        </p>
      )}
      {children && <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function ErrorState({
  title = "That didn't load",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-card)] border border-danger/25 bg-danger-soft px-5 py-4"
    >
      <p className="text-sm font-medium text-danger">{title}</p>
      {message && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-medium text-danger underline underline-offset-4"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-lg ${className}`} />;
}

/** Placeholder shelf entries — shaped like the real thing, so nothing jumps. */
export function CardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8">
      <span className="sr-only">Loading recommendations…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-3/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}
