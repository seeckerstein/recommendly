export function Avatar({
  name,
  size = 40,
  className = "",
}: {
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600 select-none ${className}`}
    >
      {initials || "?"}
    </span>
  );
}