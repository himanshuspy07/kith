
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// These values are public and safe to include in the service worker
firebase.initializeApp({
  "projectId": "studio-7823896099-d3f14",
  "appId": "1:1092017196904:web:9f0712e970a240f915d0dd",
  "apiKey": "AIzaSyD9dn4wj2w7qjodCzQZeS1DaAN2arjW8_o",
  "messagingSenderId": "1092017196904"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: payload.data?.roomId || 'new-msg',
    data: {
      url: self.location.origin
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
