export function Rating({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const clamped = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span
      role="img"
      aria-label={`Rated ${clamped} out of 5`}
      className={`inline-flex items-center gap-[3px] leading-none text-accent ${
        size === "sm" ? "text-[11px]" : "text-[13px]"
      }`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden className={i <= clamped ? "" : "text-line-strong"}>
          ★
        </span>
      ))}
    </span>
  );
}

/** Accessible 1–5 picker built from radios, styled as stars. */
export function RatingInput({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = (value ?? 0) >= n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => onChange(value === n ? null : n)}
              className={`inline-flex size-11 items-center justify-center rounded-full text-xl transition-colors ${
                selected ? "text-accent" : "text-line-strong hover:text-accent/50"
              }`}
            >
              ★
            </button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={value ?? ""} />
      {value != null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-ink-faint underline underline-offset-2 hover:text-ink"
        >
          Clear
        </button>
      )}
    </div>
  );
}
