importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAsbXfjQH1nW1pelSgVcPBZwe0uMqKd9fM",
  authDomain: "menuor-2d6e7.firebaseapp.com",
  projectId: "menuor-2d6e7",
  storageBucket: "menuor-2d6e7.firebasestorage.app",
  messagingSenderId: "470424760782",
  appId: "1:470424760782:web:67287c52e03541dc2dfb9f",
});

const messaging = firebase.messaging();

const CACHE_NAME = "menuor-shell-v2";
// This worker is only ever registered from the dashboard (see
// src/app/dashboard/layout.tsx) — /manifest.webmanifest was the
// customer-facing root manifest and no longer exists (see
// src/app/dashboard/manifest.webmanifest/route.ts for the current one).
const SHELL_ASSETS = ["/logo.svg", "/dashboard/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  // cache.addAll() is all-or-nothing — one failed fetch (a renamed asset, a
  // route that no longer exists) rejects the whole install, the worker
  // never activates, and navigator.serviceWorker.ready then hangs forever
  // for every caller (this is exactly what silently broke push
  // registration once before). Cache each asset independently instead, so
  // one bad URL can't take the whole worker down.
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          SHELL_ASSETS.map((url) => cache.add(url).catch((err) => console.warn("[SW] precache failed:", url, err)))
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) return;
  const path = new URL(event.request.url).pathname;
  const privateRoute = path.startsWith("/dashboard") || path.startsWith("/admin") || path.startsWith("/api") || path.startsWith("/login") || path.startsWith("/register");
  event.respondWith(fetch(event.request).then((response) => {
    if (!privateRoute && response.ok && event.request.destination === "document") {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))));
});

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(title || "Menuor", {
    body,
    icon: "/logo.svg",
    data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
