/* eslint-disable @next/next/no-img-element */

function initialsOf(name?: string | null) {
  return (name ?? "?")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = initialsOf(name) || "?";

  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full border border-line object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.34) }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-accent-soft font-medium tracking-wide text-accent-ink ${className}`}
    >
      {initials}
    </span>
  );
}
