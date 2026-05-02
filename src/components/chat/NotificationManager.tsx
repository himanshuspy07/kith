
"use client";

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, arrayUnion } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface NotificationManagerProps {
  currentConversationId?: string;
}

// NOTE: You must generate a VAPID key in the Firebase Console (Settings > Cloud Messaging)
// and replace this placeholder to enable push tokens.
const VAPID_KEY = "BDp_S9G4eE_J0Yn8R_E...YOUR_ACTUAL_VAPID_KEY";

export default function NotificationManager({ currentConversationId }: NotificationManagerProps) {
  const { user } = useUser();
  const db = useFirestore();
  const lastNotifiedRef = useRef<Record<string, string>>({});
  const isFirstLoad = useRef(true);

  // Setup FCM for 100% reliable background notifications
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
          // Get registration token
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          
          if (token) {
            // Save token to user profile for server-side push targeting
            const userRef = doc(db, 'users', user.uid);
            updateDocumentNonBlocking(userRef, {
              fcmTokens: arrayUnion(token)
            });
          }

          // Listen for foreground messages
          onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            // Optionally show a custom in-app notification here
          });
        }
      } catch (error) {
        console.warn("FCM setup failed. This is expected if VAPID_KEY is not set or browser is offline.", error);
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

  // Foreground notification logic (while tab is open)
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

    rooms.forEach(room => {
      const lastUpdate = room.updatedAt?.toDate?.()?.getTime() || Date.now();
      const isRecent = (Date.now() - lastUpdate) < 300000; 
      const isNewMessage = room.lastMessageText && lastNotifiedRef.current[room.id] !== room.lastMessageText;
      const isFromOther = room.lastMessageSenderId !== user.uid;
      const isNotCurrent = room.id !== currentConversationId;

      if (isNewMessage && isFromOther && isNotCurrent && isRecent) {
        try {
          const n = new Notification(room.displayName || room.name || "kith", {
            body: room.lastMessageText,
            icon: "/icon.svg",
            badge: "/icon.svg",
            tag: room.id, 
            renotify: true
          });
          
          n.onclick = () => {
            window.focus();
            n.close();
          };
          
          setTimeout(() => n.close(), 5000);
        } catch (e) {
          console.error("Failed to show foreground notification:", e);
        }
        lastNotifiedRef.current[room.id] = room.lastMessageText;
      } else if (!isFromOther || !isNotCurrent) {
        lastNotifiedRef.current[room.id] = room.lastMessageText;
      }
    });
  }, [rooms, user, currentConversationId]);

  return null;
}
