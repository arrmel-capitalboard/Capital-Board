importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBnHkOTwFoJNMvYOgG7Ne-AFKgE3GBRiNU",
  authDomain: "capitalboard.firebaseapp.com",
  projectId: "capitalboard",
  storageBucket: "capitalboard.firebasestorage.app",
  messagingSenderId: "719745213666",
  appId: "1:719745213666:web:02a3276a6348df7fed6abb"
});

// Active immédiatement le nouveau service worker (sinon l'ancien continue de
// tourner et lit l'ancien format de payload → notif sans message).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

const messaging = firebase.messaging();

// Messages DATA-ONLY (le Worker n'envoie plus de champ `notification` pour
// éviter le double affichage). On lit donc le contenu dans payload.data.
messaging.onBackgroundMessage(payload => {
  const d = payload.data || {};
  const title = d.title || payload.notification?.title || 'Capital Board';
  const body  = d.body  || payload.notification?.body  || '';
  self.registration.showNotification(title, {
    body,
    icon:  './assets/logo.png',
    badge: './assets/logo.png',
    tag:   d.type || 'capitalboard',   // même tag → remplace au lieu d'empiler
    renotify: true,
    data:  d
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) { if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow('/');
  }));
});
