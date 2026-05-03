importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD9dn4wj2w7qjodCzQZeS1DaAN2arjW8_o",
  authDomain: "studio-7823896099-d3f14.firebaseapp.com",
  projectId: "studio-7823896099-d3f14",
  storageBucket: "studio-7823896099-d3f14.firebasestorage.app",
  messagingSenderId: "1092017196904",
  appId: "1:1092017196904:web:9f0712e970a240f915d0dd"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});