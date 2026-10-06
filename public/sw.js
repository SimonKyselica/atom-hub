// Atom Hub service worker — makes the app installable, fast and usable offline (read-only).
const VERSION = "v2";
const STATIC_CACHE = `atom-static-${VERSION}`;
const PAGE_CACHE = `atom-pages-${VERSION}`;
const PRECACHE = ["/offline", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/badge-96.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC_CACHE, PAGE_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  // Sent on logout so a shared device never shows the previous user's pages offline.
  if (event.data === "clear-pages") event.waitUntil(caches.delete(PAGE_CACHE));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Hashed build assets and icons never change: cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Pages: always try the network for fresh data, fall back to the last copy, then the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/offline")) || Response.error()),
    );
  }
  // Everything else (RSC payloads, Server Actions) goes straight to the network.
});

// ---------- Push notifications ----------

const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge-96.png"; // monochrome, for the Android status bar

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Atom Hub", body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Atom Hub", {
      body: data.body || "",
      icon: ICON,
      badge: BADGE,
      tag: data.tag,
      renotify: Boolean(data.tag),
      actions: data.actions || [],
      data: { url: data.url || "/", ...(data.data || {}) },
    }),
  );
});

async function openUrl(url) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) {
    if ("focus" in client) {
      await client.focus();
      if ("navigate" in client) await client.navigate(url);
      return;
    }
  }
  await self.clients.openWindow(url);
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  event.notification.close();

  // "✓ Mark done" straight from the notification — no need to open the app.
  if (event.action === "done" && data.habitId) {
    event.waitUntil(
      fetch(`/api/habits/${data.habitId}/check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: data.date }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((res) =>
          self.registration.showNotification(`✓ ${data.name || "Habit"} done`, {
            body: res.xp > 0 ? `+${res.xp} XP · +${res.coins} coins` : "Already logged for today.",
            icon: ICON,
            badge: BADGE,
            tag: `habit-${data.habitId}`,
          }),
        )
        .catch(() => openUrl(data.url || "/")),
    );
    return;
  }

  event.waitUntil(openUrl(data.url || "/"));
});
