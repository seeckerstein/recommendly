import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  mobile?: boolean;
  accent?: boolean;
  icon: (props: { className?: string }) => ReactNode;
};

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Home",
    mobile: true,
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
    ),
  },
  {
    href: "/discover",
    label: "Discover",
    mobile: true,
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    ),
  },
  {
    href: "/new",
    label: "Add",
    mobile: true,
    accent: true,
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className}><path d="M12 5v14M5 12h14"/></svg>
    ),
  },
  {
    href: "/mine",
    label: "My Recommendations",
    shortLabel: "Mine",
    mobile: true,
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 2h12l-2 6a4 4 0 1 1-8 0z"/><path d="M12 12v8m-4 2h8"/></svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    mobile: true,
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-5 8-5s6.5 1 8 5"/></svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 21V15m6 6V15"/></svg>
    ),
  },
];