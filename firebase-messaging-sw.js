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

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'Capital Board';
  const body  = payload.notification?.body  || '';
  self.registration.showNotification(title, {
    body,
    icon:  './assets/logo.png',
    badge: './assets/logo.png',
    tag:   payload.data?.type || 'capitalboard',
    data:  payload.data || {}
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) { if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow('/');
  }));
});
