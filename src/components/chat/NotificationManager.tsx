
"use client";

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, arrayUnion } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface NotificationManagerProps {
  currentConversationId?: string;
}

// Your provided VAPID key
const VAPID_KEY = "BCg1UIFx2xNkxfPrxSeATRRO2jyjVh2c2C_9AEfN3FsbTFjcS3EN5fyF3qIDsWbSt5RN_L4UpGWlq4QTuBJwplE";

export default function NotificationManager({ currentConversationId }: NotificationManagerProps) {
  const { user } = useUser();
  const db = useFirestore();

  useEffect(() => {
    if (!user || typeof window === 'undefined' || !("Notification" in window)) return;

    const setupFCM = async () => {
      try {
        const messaging = getMessaging();
        
        // Registration for background messages
        const registration = await navigator.serviceWorker.ready;
        
        // Get unique device token
        const token = await getToken(messaging, { 
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });
        
        if (token) {
          // Save token to user profile so the server knows where to send alerts
          const userRef = doc(db, 'users', user.uid);
          updateDocumentNonBlocking(userRef, {
            fcmTokens: arrayUnion(token)
          });
          console.log("FCM Token registered successfully");
        }

        // Handle messages while the app is open (Foreground)
        onMessage(messaging, (payload) => {
          console.log('Foreground message:', payload);
          if (payload.notification && payload.data?.roomId !== currentConversationId) {
            new Notification(payload.notification.title || "kith", {
              body: payload.notification.body,
              icon: "/icon.svg",
            });
          }
        });
      } catch (error) {
        console.warn("FCM setup failed. This is expected if permissions are not yet granted.", error);
      }
    };

    if (Notification.permission === 'granted') {
      setupFCM();
    }
  }, [user, db, currentConversationId]);

  return null;
}
