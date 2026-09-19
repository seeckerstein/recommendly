import type { ReactNode } from "react";

/** Shared frame for the signed-out screens: sign in, sign up, password reset. */
export function AuthShell({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-6 py-12">
      <div className="w-full">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Recommendly
        </p>
        <h1 className="display mt-3 text-[2.25rem] font-normal leading-[1.1] text-ink">
          {title}
        </h1>
        {lede && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{lede}</p>}
        <div className="mt-9">{children}</div>
        {footer && <div className="mt-7 text-sm text-ink-soft">{footer}</div>}
      </div>
    </main>
  );
}
