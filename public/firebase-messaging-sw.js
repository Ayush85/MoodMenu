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

const CACHE_NAME = "menuor-shell-v1";
const SHELL_ASSETS = ["/", "/logo.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
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
