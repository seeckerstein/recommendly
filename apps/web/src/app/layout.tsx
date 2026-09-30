import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YOU'D LIKE — recommendations from people you trust",
  description:
    "A quiet place to keep the books, films, series and places worth another person's time — and see what the people you trust think you'd like.",
  openGraph: {
    title: "YOU'D LIKE — recommendations from people you trust",
    description:
      "Keep the books, films, series and places worth another person's time, and see what the people you trust think you'd like.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  manifest: "/manifest.json",
  themeColor: "#faf7f1",
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "YOU'D LIKE",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-full bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
