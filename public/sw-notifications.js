self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() ?? {};
  const title = payload.title || "第一步提醒";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "有一条新的启动提醒。",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: payload.tag || `first-step-push-${Date.now()}`,
      data: {
        url: payload.url || "/reminders",
        taskId: payload.taskId || null,
        scheduledForIso: payload.scheduledForIso || null,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const targetUrl = event.notification?.data?.url || "/reminders";

  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
