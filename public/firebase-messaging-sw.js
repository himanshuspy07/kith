
// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in your app's Firebase config object.
// The config is fetched from the client side or hardcoded here for reliability.
firebase.initializeApp({
  apiKey: "AIzaSyD9dn4wj2w7qjodCzQZeS1DaAN2arjW8_o",
  authDomain: "studio-7823896099-d3f14.firebaseapp.com",
  projectId: "studio-7823896099-d3f14",
  storageBucket: "studio-7823896099-d3f14.firebasestorage.app",
  messagingSenderId: "1092017196904",
  appId: "1:1092017196904:web:9f0712e970a240f915d0dd"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'kith';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
