
"use client";

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, where, doc, arrayUnion, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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

  const roomsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'chatRooms'), where(`members.${user.uid}`, '==', true));
  }, [db, user?.uid]);
  
  const { data: rooms } = useCollection(roomsQuery);

  useEffect(() => {
    if (!rooms || !user || !db) return;

    rooms.forEach(async (room) => {
      const roomId = room.id;
      const lastMsg = room.lastMessageText;
      const lastSender = room.lastMessageSenderId;

      if (
        lastMsg && 
        lastSender !== user.uid && 
        roomId !== currentConversationId &&
        lastProcessedMessages.current[roomId] !== undefined &&
        lastProcessedMessages.current[roomId] !== lastMsg
      ) {
        // 1. Fetch user prefs
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const prefs = userSnap.data()?.notificationPreferences || { muteAll: false, allMessages: true };

        if (prefs.muteAll) return;
        
        // 2. Check mentions logic if mentionsOnly is on
        if (prefs.mentionsOnly && !lastMsg.includes(`@${userSnap.data()?.username}`)) return;

        // 3. Create a Notification History entry in Firestore
        const notifData = {
          userId: user.uid,
          title: room.isGroupChat ? room.name : "kith",
          body: lastMsg,
          type: lastMsg.includes(`@${userSnap.data()?.username}`) ? 'mention' : 'message',
          link: `/?roomId=${roomId}`,
          isRead: false,
          createdAt: serverTimestamp(),
        };
        addDocumentNonBlocking(collection(db, 'users', user.uid, 'notifications'), notifData);

        // 4. Show Local In-App Notification (Toast)
        toast({
          title: room.isGroupChat ? `${room.name} - Message` : "New Message",
          description: lastMsg,
          className: "bg-primary text-primary-foreground border-none rounded-2xl shadow-2xl",
        });

        // 5. Native OS Notification if permission granted
        if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "granted") {
          new Notification(room.isGroupChat ? room.name : "kith", {
            body: lastMsg,
            icon: "/icon.svg",
          });
        }
      }
      
      lastProcessedMessages.current[roomId] = lastMsg || "";
    });
  }, [rooms, user, currentConversationId, db, toast]);

  useEffect(() => {
    if (!user || !db || typeof window === 'undefined' || !("Notification" in window) || !('serviceWorker' in navigator)) return;

    const setupFCM = async () => {
      try {
        const messaging = getMessaging();
        const registration = await navigator.serviceWorker.ready;
        
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

        onMessage(messaging, (payload) => {
          if (payload.notification && payload.data?.roomId !== currentConversationId) {
            toast({
              title: payload.notification.title || "kith",
              description: payload.notification.body,
              className: "bg-accent text-accent-foreground border-none rounded-2xl",
            });
          }
        });
      } catch (error) {
        // Silent fail
      }
    };

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
