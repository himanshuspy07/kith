"use client";

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

interface NotificationManagerProps {
  currentConversationId?: string;
}

export default function NotificationManager({ currentConversationId }: NotificationManagerProps) {
  const { user } = useUser();
  const db = useFirestore();
  const lastNotifiedRef = useRef<Record<string, string>>({});
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!("Notification" in window)) return;
  }, []);

  const roomsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'chatRooms'),
      where(`members.${user.uid}`, '==', true)
    );
  }, [db, user?.uid]);

  const { data: rooms } = useCollection(roomsQuery);

  useEffect(() => {
    if (!rooms || !user) return;

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
        if (Notification.permission === "granted") {
          try {
            const n = new Notification(room.displayName || room.name || "kith", {
              body: room.lastMessageText,
              icon: "/icon.svg",
              badge: "/icon.svg",
              tag: room.id, 
              renotify: true
            });
            
            setTimeout(() => n.close(), 5000);
          } catch (e) {
            console.error("Failed to show notification:", e);
          }
          lastNotifiedRef.current[room.id] = room.lastMessageText;
        }
      } else if (!isFromOther || !isNotCurrent) {
        lastNotifiedRef.current[room.id] = room.lastMessageText;
      }
    });
  }, [rooms, user, currentConversationId]);

  return null;
}
