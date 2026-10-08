// YOU'D LIKE service worker: handles Web Push delivery and notification
// clicks in the background. The Activity indicator in the app itself is
// driven by `notifications.read_at` and is unaffected by this file.

const NOTIFICATIONS_URL = "/notifications";

self.addEventListener("push", (event) => {
  let data = { title: "YOU'D LIKE", body: "You have a new notification.", url: NOTIFICATIONS_URL };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Keep the fallback payload; never block notification display.
  }
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.tag,
        icon: "/icons/youdlike-icon-192.png",
        badge: "/icons/youdlike-icon-192.png",
        data: { url: data.url ?? NOTIFICATIONS_URL },
      });
      if (navigator.setAppBadge) {
        try {
          await navigator.setAppBadge();
        } catch {
          // Badging is optional and unsupported on some platforms.
        }
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? NOTIFICATIONS_URL;
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const absolute = new URL(target, self.location.origin).href;
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin)) {
          await client.navigate(absolute).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(absolute);
    })(),
  );
});
