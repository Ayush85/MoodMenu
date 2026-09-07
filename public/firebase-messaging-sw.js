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

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(title || "Menuor", {
    body,
    icon: "/logo-kathmandu.svg",
    data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
