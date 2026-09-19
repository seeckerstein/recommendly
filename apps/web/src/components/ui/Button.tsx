import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-full font-medium transition-[background-color,color,border-color,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  accent: "bg-accent text-white hover:bg-accent-ink shadow-quiet",
  primary: "bg-ink text-paper hover:bg-ink-soft",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-sunk",
  ghost: "text-ink-soft hover:bg-surface-sunk hover:text-ink",
  danger: "bg-danger text-white hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3.5 text-[13px]",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-[15px]",
};

type Shared = { variant?: Variant; size?: Size };

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & Shared) {
  return (
    <button
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & Shared) {
  return (
    <Link className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
  );
}

/** Small square icon-only control with an accessible label. */
export function IconButton({
  label,
  className = "",
  ...props
}: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunk hover:text-ink ${className}`}
      {...props}
    />
  );
}
