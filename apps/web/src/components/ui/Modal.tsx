"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Native <dialog> so focus trapping, Esc and inertness come from the platform.
 * Presents as a bottom sheet on small screens, a centred card from sm up.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className="w-full max-w-none rounded-t-3xl bg-surface p-0 text-ink shadow-lift backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] mt-auto mb-0 mx-auto sm:m-auto sm:w-[min(92vw,30rem)] sm:rounded-[var(--radius-card)] open:rise"
    >
      <div className="px-6 pb-7 pt-6">
        <div
          aria-hidden
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-line-strong sm:hidden"
        />
        <h2 id="modal-title" className="display text-xl leading-snug text-ink">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </dialog>
  );
}
