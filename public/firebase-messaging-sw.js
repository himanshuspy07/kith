
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD9dn4wj2w7qjodCzQZeS1DaAN2arjW8_o",
  authDomain: "studio-7823896099-d3f14.firebaseapp.com",
  projectId: "studio-7823896099-d3f14",
  storageBucket: "studio-7823896099-d3f14.appspot.com",
  messagingSenderId: "1092017196904",
  appId: "1:1092017196904:web:9f0712e970a240f915d0dd"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'New Message';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: payload.data?.room_id || 'default',
    data: {
      url: payload.data?.url || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
