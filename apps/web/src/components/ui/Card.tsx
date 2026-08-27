import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm ${className}`}
      {...props}
    />
  );
}

export function Page({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`mx-auto w-full max-w-3xl px-4 pt-6 pb-24 md:px-8 md:pb-12 ${className}`}
      {...props}
    />
  );
}

export function PageTitle({
  eyebrow,
  children,
}: {
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <header>
      {eyebrow && (
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">{eyebrow}</p>
      )}
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl">
        {children}
      </h1>
    </header>
  );
}