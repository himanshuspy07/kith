
"use client";

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface NotificationManagerProps {
  currentConversationId?: string;
}

/**
 * Handles browser system notifications for new incoming messages.
 * Listens to all chat rooms the user is a member of.
 */
export default function NotificationManager({ currentConversationId }: NotificationManagerProps) {
  const { user } = useUser();
  const db = useFirestore();
  const lastNotifiedRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
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

    rooms.forEach(room => {
      // Trigger notification if:
      // 1. Room has a last message
      // 2. Sender is not current user
      // 3. We are not currently looking at this specific conversation
      // 4. We haven't already notified for this specific message text/timestamp
      const isNewMessage = room.lastMessageText && lastNotifiedRef.current[room.id] !== room.lastMessageText;
      const isFromOther = room.lastMessageSenderId !== user.uid;
      const isNotCurrent = room.id !== currentConversationId;

      if (isNewMessage && isFromOther && isNotCurrent) {
        if (Notification.permission === "granted") {
          new Notification(room.name || "Kith", {
            body: room.lastMessageText,
            icon: "/icon.svg",
          });
          lastNotifiedRef.current[room.id] = room.lastMessageText;
        }
      } else if (!isFromOther || !isNotCurrent) {
        // Sync ref if we saw it or sent it
        lastNotifiedRef.current[room.id] = room.lastMessageText;
      }
    });
  }, [rooms, user, currentConversationId]);

  return null;
}
