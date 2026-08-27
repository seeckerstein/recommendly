import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recommendly",
  description: "Personal recommendations from people you trust.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full bg-neutral-50 text-neutral-900 antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}