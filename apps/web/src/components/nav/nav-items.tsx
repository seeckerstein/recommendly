import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  mobile?: boolean;
  accent?: boolean;
  /** Rendered in the sidebar's lower group rather than the main list. */
  footer?: boolean;
  /** Extra path prefixes that should light this item up. */
  matchPrefixes?: string[];
  icon: (props: { className?: string }) => ReactNode;
};

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  if (pathname === item.href) return true;
  return (item.matchPrefixes ?? []).some((p) => pathname.startsWith(p));
}

export const notificationsIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a2 2 0 0 0 3.4 0" />
  </svg>
);

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Home",
    mobile: true,
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
    ),
  },
  {
    href: "/discover-recommendations",
    label: "Recommended to you",
    shortLabel: "For you",
    mobile: true,
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M4 5.5h11M4 12h16M4 18.5h9"/><circle cx="19" cy="5.5" r="2"/></svg>
    ),
  },
  {
    href: "/new",
    label: "Share",
    mobile: true,
    accent: true,
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" className={className} aria-hidden><path d="M12 5v14M5 12h14"/></svg>
    ),
  },
  {
    href: "/mine",
    label: "My shelf",
    shortLabel: "My shelf",
    mobile: true,
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16.5 5.2 3.4.9-3 14"/></svg>
    ),
  },
  {
    href: "/discover",
    label: "Find people",
    shortLabel: "People",
    mobile: true,
    matchPrefixes: ["/discover/"],
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    footer: true,
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-5 8-5s6.5 1 8 5"/></svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    footer: true,
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.4 7a1.7 1.7 0 0 0-.3-1.9L2 5a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V1a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 2.4a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 21.8 4.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.2z" transform="translate(1 1) scale(0.92)"/></svg>
    ),
  },
];
