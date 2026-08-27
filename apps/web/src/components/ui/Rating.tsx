export function Rating({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <span
      role="img"
      aria-label={`Rated ${clamped} out of 5`}
      className="inline-flex gap-0.5 text-[--color-accent]"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden className={i <= clamped ? "" : "opacity-25"}>
          ★
        </span>
      ))}
    </span>
  );
}