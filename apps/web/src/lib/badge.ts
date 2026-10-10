"use client";

// Browser-tab favicon indicator for unread Activity notifications.
// The OS/PWA app badge is driven by the service worker and the
// setAppBadge/clearAppBadge calls below. `notifications.read_at`
// remains the single source of truth for unread state.

const originalFavicons = new Map<HTMLLinkElement, string>();

function badgeFaviconDataUrl(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#faf7f1";
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = "#e5484d";
  ctx.beginPath();
  ctx.arc(24, 8, 7, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL("image/png");
}

export function syncBrowserTabBadge(unreadCount: number): void {
  if (typeof document === "undefined") return;

  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'),
  );
  for (const link of links) {
    if (!originalFavicons.has(link)) originalFavicons.set(link, link.href);
  }

  if (unreadCount > 0) {
    const dataUrl = badgeFaviconDataUrl();
    for (const link of links) link.href = dataUrl;
  } else {
    for (const link of links) {
      const original = originalFavicons.get(link);
      if (original) link.href = original;
    }
  }

  const nav = navigator as Navigator & {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (unreadCount > 0 && nav.setAppBadge) void nav.setAppBadge(unreadCount);
    if (unreadCount === 0 && nav.clearAppBadge) void nav.clearAppBadge();
  } catch {
    // Badging API may not be supported; ignore silently.
  }
}
