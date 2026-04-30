
"use client";

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

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
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!("Notification" in window)) return;
    
    // Check permission status on mount
    if (Notification.permission === "default") {
      // We don't auto-request here anymore to avoid annoying the user on every refresh
      // Requesting is now handled by the button in Sidebar settings
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

    // Suppression logic: On the very first data arrival, we just record the current state 
    // without triggering any notifications.
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
      // Check if message is fresh (within last 5 minutes) to avoid stale notifications
      const lastUpdate = room.updatedAt?.toDate?.()?.getTime() || Date.now();
      const isRecent = (Date.now() - lastUpdate) < 300000; // 5 minutes

      const isNewMessage = room.lastMessageText && lastNotifiedRef.current[room.id] !== room.lastMessageText;
      const isFromOther = room.lastMessageSenderId !== user.uid;
      const isNotCurrent = room.id !== currentConversationId;

      if (isNewMessage && isFromOther && isNotCurrent && isRecent) {
        if (Notification.permission === "granted") {
          try {
            const n = new Notification(room.displayName || room.name || "Kith", {
              body: room.lastMessageText,
              icon: "/icon.svg",
              badge: "/icon.svg",
              tag: room.id, // Group notifications by room
              renotify: true
            });
            
            // Auto-close notification after 5 seconds
            setTimeout(() => n.close(), 5000);
          } catch (e) {
            console.error("Failed to show notification:", e);
          }
          lastNotifiedRef.current[room.id] = room.lastMessageText;
        }
      } else if (!isFromOther || !isNotCurrent) {
        // Always sync the ref if we are looking at the chat or if we sent the message
        lastNotifiedRef.current[room.id] = room.lastMessageText;
      }
    });
  }, [rooms, user, currentConversationId]);

  return null;
}
