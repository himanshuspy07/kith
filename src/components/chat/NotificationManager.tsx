"use client";

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, where, doc, arrayUnion } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

interface NotificationManagerProps {
  currentConversationId?: string;
}

const VAPID_KEY = "BCg1UIFx2xNkxfPrxSeATRRO2jyjVh2c2C_9AEfN3FsbTFjcS3EN5fyF3qIDsWbSt5RN_L4UpGWlq4QTuBJwplE";

/**
 * Handles real-time notifications for the app.
 * Logic:
 * 1. Foreground/Tab-Open: Uses a Firestore listener to detect new 'lastMessageText' in all user rooms.
 * 2. Background (PWA): Sets up FCM tokens for future backend integration.
 */
export default function NotificationManager({ currentConversationId }: NotificationManagerProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const lastProcessedMessages = useRef<Record<string, string>>({});

  const roomsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'chatRooms'), where(`members.${user.uid}`, '==', true));
  }, [db, user?.uid]);
  
  const { data: rooms } = useCollection(roomsQuery);

  // --- Real-time "Open Tab" Notifications ---
  useEffect(() => {
    if (!rooms || !user || !db) return;

    rooms.forEach(async (room) => {
      const roomId = room.id;
      const lastMsg = room.lastMessageText;
      const lastSender = room.lastMessageSenderId;

      // Only notify if it's a new message, not from me, and I'm not in that specific chat
      if (
        lastMsg && 
        lastSender !== user.uid && 
        roomId !== currentConversationId &&
        lastProcessedMessages.current[roomId] !== undefined &&
        lastProcessedMessages.current[roomId] !== lastMsg
      ) {
        // 1. In-App Toast
        toast({
          title: room.isGroupChat ? `${room.name} - Message` : "New Message",
          description: lastMsg,
          className: "bg-primary text-primary-foreground border-none rounded-2xl shadow-2xl",
        });

        // 2. Native OS Notification (if permission granted)
        if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "granted") {
          try {
            const n = new Notification(room.isGroupChat ? room.name : "kith", {
              body: lastMsg,
              icon: "/icon.svg",
              badge: "/icon.svg",
              silent: false,
            });
            n.onclick = () => {
              window.focus();
              // In a more complex app, we'd navigate to the chat here
            };
          } catch (e) {
            console.warn("Browser blocked notification execution.");
          }
        }
      }
      
      // Seed or update the tracker
      lastProcessedMessages.current[roomId] = lastMsg || "";
    });
  }, [rooms, user, currentConversationId, db, toast]);

  // --- FCM (Firebase Cloud Messaging) Token Registration ---
  useEffect(() => {
    if (!user || !db || typeof window === 'undefined' || !("Notification" in window)) return;

    const setupFCM = async () => {
      try {
        const messaging = getMessaging();
        
        // Request token (PWA / Browser)
        const token = await getToken(messaging, { 
          vapidKey: VAPID_KEY
        });
        
        if (token) {
          const userRef = doc(db, 'users', user.uid);
          setDocumentNonBlocking(userRef, {
            fcmTokens: arrayUnion(token)
          }, { merge: true });
        }

        // Handle foreground messages from FCM (if backend is active)
        onMessage(messaging, (payload) => {
          if (payload.notification && payload.data?.roomId !== currentConversationId) {
            toast({
              title: payload.notification.title || "kith",
              description: payload.notification.body,
              className: "bg-accent text-accent-foreground border-none rounded-2xl shadow-xl",
            });
          }
        });
      } catch (error) {
        // Silent fail - likely due to blocked permissions or missing Service Worker
      }
    };

    // Polite permission request
    if (Notification.permission === 'granted') {
      setupFCM();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') setupFCM();
      });
    }
  }, [user, currentConversationId, db, toast]);

  return null;
}
