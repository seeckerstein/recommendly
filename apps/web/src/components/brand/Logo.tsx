"use client";

import Link from "next/link";

type LogoProps = {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { icon: 18, text: "text-[0.95rem]" },
  md: { icon: 22, text: "text-[1.125rem]" },
  lg: { icon: 28, text: "text-[1.375rem]" },
};

/** The YOU'D LIKE mark: two overlapping conversation marks. */
export function LogoMark({
  className,
  size = 24,
  title = "YOU'D LIKE",
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path
        d="M23.5 5.5c10.5 0 17.5 7 17.5 17 0 9.5-5.5 16.5-13 21.5-4 2.5-7 5.5-8 9.5-2.5-1.5-4.5-3.5-5.5-6.5-1-2.5-1.5-5-1.5-7.5C7 35 3.5 29 3.5 22.5 3.5 12.5 13 5.5 23.5 5.5Z"
        fill="#a8401d"
      />
      <path
        d="M44.5 18.5c9 0 16 6.5 16 16 0 8.5-4.5 15-11 19.5-3 2-5 4.5-5.5 7.5-2-1-3.5-2.5-4.5-4.5-1-2-1.5-4-1.5-6-5-4-8-9.5-8-16.5 0-9.5 7-16 16-16Z"
        fill="#f3e5dd"
        fillOpacity="0.92"
      />
    </svg>
  );
}

/** Full wordmark for navigation and public pages. */
export function Logo({ className, href = "/", size = "md" }: LogoProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 leading-none text-ink ${className ?? ""}`}
    >
      <LogoMark size={sizes[size].icon} />
      <span className={`display ${sizes[size].text} tracking-[-0.02em]`}>
        YOU'D LIKE
      </span>
    </Link>
  );
}
