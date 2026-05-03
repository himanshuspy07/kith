
// Scripts for firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// This config MUST match your src/firebase/config.ts
firebase.initializeApp({
  "projectId": "studio-7823896099-d3f14",
  "appId": "1:1092017196904:web:9f0712e970a240f915d0dd",
  "apiKey": "AIzaSyD9dn4wj2w7qjodCzQZeS1DaAN2arjW8_o",
  "messagingSenderId": "1092017196904"
});

const messaging = firebase.messaging();

// This handles the notification when the app is CLOSED or in the BACKGROUND
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
