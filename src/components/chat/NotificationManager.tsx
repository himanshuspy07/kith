
"use client";

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, arrayUnion } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface NotificationManagerProps {
  currentConversationId?: string;
}

// Provided VAPID key for Firebase Cloud Messaging
const VAPID_KEY = "BCg1UIFx2xNkxfPrxSeATRRO2jyjVh2c2C_9AEfN3FsbTFjcS3EN5fyF3qIDsWbSt5RN_L4UpGWlq4QTuBJwplE";

export default function NotificationManager({ currentConversationId }: NotificationManagerProps) {
  const { user } = useUser();
  const db = useFirestore();
  const lastNotifiedRef = useRef<Record<string, string>>({});
  const isFirstLoad = useRef(true);

  // Setup FCM and Token Registration
  useEffect(() => {
    if (!user || typeof window === 'undefined' || !("Notification" in window)) return;

    const setupFCM = async () => {
      try {
        const messaging = getMessaging();
        
        // Request permission if not already granted
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }

        if (Notification.permission === 'granted') {
          // Register Service Worker explicitly for FCM
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          
          // Get registration token
          const token = await getToken(messaging, { 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
          });
          
          if (token) {
            const userRef = doc(db, 'users', user.uid);
            updateDocumentNonBlocking(userRef, {
              fcmTokens: arrayUnion(token)
            });
          }

          // Foreground messages
          onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
          });
        }
      } catch (error) {
        console.warn("FCM setup failed:", error);
      }
    };

    setupFCM();
  }, [user, db]);

  const roomsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'chatRooms'),
      where(`members.${user.uid}`, '==', true)
    );
  }, [db, user?.uid]);

  const { data: rooms } = useCollection(roomsQuery);

  // Client-side background listener (works if browser hasn't killed the process)
  useEffect(() => {
    if (!rooms || !user || Notification.permission !== 'granted') return;

    if (isFirstLoad.current) {
      rooms.forEach(room => {
        if (room.lastMessageText) {
          lastNotifiedRef.current[room.id] = room.lastMessageText;
        }
      });
      isFirstLoad.current = false;
      return;
    }

    rooms.forEach(async (room) => {
      const lastUpdate = room.updatedAt?.toDate?.()?.getTime() || Date.now();
      const isRecent = (Date.now() - lastUpdate) < 300000; 
      const isNewMessage = room.lastMessageText && lastNotifiedRef.current[room.id] !== room.lastMessageText;
      const isFromOther = room.lastMessageSenderId !== user.uid;
      const isNotCurrent = room.id !== currentConversationId;

      if (isNewMessage && isFromOther && isNotCurrent && isRecent) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          // Use showNotification for 100% mobile compatibility
          await registration.showNotification(room.displayName || room.name || "kith", {
            body: room.lastMessageText,
            icon: "/icon.svg",
            badge: "/icon.svg",
            tag: room.id,
            renotify: true,
            data: { url: window.location.origin }
          });
        } catch (e) {
          console.error("Failed to show notification:", e);
        }
        lastNotifiedRef.current[room.id] = room.lastMessageText;
      } else if (!isFromOther || !isNotCurrent) {
        lastNotifiedRef.current[room.id] = room.lastMessageText;
      }
    });
  }, [rooms, user, currentConversationId]);

  return null;
}
