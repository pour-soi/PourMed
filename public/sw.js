const CACHE = "pourmed-shell-v10",
  SHELL = [
    "/",
    "/manifest.webmanifest",
    "/icons/icon.svg",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
  ];
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window", includeUncontrolled: true }),
      )
      .then((windows) =>
        Promise.all(
          windows.map((client) => {
            client.postMessage({ type: "POURMED_ACTIVATED", version: "v10" });
            return client.navigate ? client.navigate(client.url) : undefined;
          }),
        ),
      ),
  ),
);
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") e.waitUntil(self.skipWaiting());
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (
    e.request.method !== "GET" ||
    u.origin !== location.origin ||
    u.pathname.startsWith("/api/")
  )
    return;
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then((r) => r || caches.match("/")),
    ),
  );
});
self.addEventListener("push", (e) => {
  let d = {
    title: "PourMed",
    body: "It’s time to take your medication.",
    url: "/",
  };
  try {
    d = { ...d, ...e.data.json() };
  } catch {}
  e.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      icon: "/icons/icon-192.png",
      ...(d.badge ? { badge: "/icons/icon-192.png" } : {}),
      silent: Boolean(d.quiet),
      tag: "pourmed-reminder",
      renotify: false,
      data: { url: d.url },
    }),
  );
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((cs) => {
        const c = cs.find((x) => new URL(x.url).origin === location.origin);
        return c
          ? c.focus().then(() => c.navigate("/"))
          : self.clients.openWindow("/");
      }),
  );
});
