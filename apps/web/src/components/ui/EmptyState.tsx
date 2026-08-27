import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-8 py-16 text-center">
      {icon && <div className="mb-4 text-3xl text-neutral-400" aria-hidden>{icon}</div>}
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-neutral-600">{description}</p>
      )}
    </div>
  );
}