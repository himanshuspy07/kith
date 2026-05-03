
"use client";

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, where } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useToast } from '@/hooks/use-toast';

interface NotificationManagerProps {
  currentConversationId?: string;
}

const VAPID_KEY = "BCg1UIFx2xNkxfPrxSeATRRO2jyjVh2c2C_9AEfN3FsbTFjcS3EN5fyF3qIDsWbSt5RN_L4UpGWlq4QTuBJwplE";

export default function NotificationManager({ currentConversationId }: NotificationManagerProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const lastProcessedMessages = useRef<Record<string, string>>({});

  // Listen to all rooms the user is a member of to trigger local notifications when minimized
  const roomsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'chatRooms'), where(`members.${user.uid}`, '==', true));
  }, [db, user?.uid]);
  
  const { data: rooms } = useCollection(roomsQuery);

  useEffect(() => {
    if (!rooms || !user) return;

    // Track changes in lastMessageText for local notifications
    rooms.forEach(room => {
      const roomId = room.id;
      const lastMsg = room.lastMessageText;
      const lastSender = room.lastMessageSenderId;

      // Only notify if:
      // 1. There is a new message
      // 2. It's not from the current user
      // 3. We aren't currently looking at this specific chat
      // 4. We've seen this room before (prevents notification on first load)
      if (
        lastMsg && 
        lastSender !== user.uid && 
        roomId !== currentConversationId &&
        lastProcessedMessages.current[roomId] !== undefined &&
        lastProcessedMessages.current[roomId] !== lastMsg
      ) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(room.isGroupChat ? room.name : "kith", {
            body: lastMsg,
            icon: "/icon.svg",
          });
        }
      }
      
      // Update our tracker
      lastProcessedMessages.current[roomId] = lastMsg || "";
    });
  }, [rooms, user, currentConversationId]);

  useEffect(() => {
    if (!user || typeof window === 'undefined' || !("Notification" in window)) return;

    const setupFCM = async () => {
      try {
        const messaging = getMessaging();
        const registration = await navigator.serviceWorker.ready;
        
        const token = await getToken(messaging, { 
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });
        
        onMessage(messaging, (payload) => {
          if (payload.notification && payload.data?.roomId !== currentConversationId) {
            new Notification(payload.notification.title || "kith", {
              body: payload.notification.body,
              icon: "/icon.svg",
            });
          }
        });
      } catch (error) {
        console.warn("FCM setup failed or ignored.");
      }
    };

    if (Notification.permission === 'granted') {
      setupFCM();
    }
  }, [user, db, currentConversationId]);

  return null;
}
