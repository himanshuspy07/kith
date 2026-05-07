
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD9dn4wj2w7qjodCzQZeS1DaAN2arjW8_o",
  authDomain: "studio-7823896099-d3f14.firebaseapp.com",
  projectId: "studio-7823896099-d3f14",
  messagingSenderId: "1092017196904",
  appId: "1:1092017196904:web:9f0712e970a240f915d0dd"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title || "kith";
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
