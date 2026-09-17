"use client";

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Handles initializing and updating the user's Firestore profile.
 * Updates online status and last active timestamp.
 * Also ensures the "Saved Messages" room exists for the user.
 */
export default function UserProfileSync() {
  const { user } = useUser();
  const db = useFirestore();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncInitiatedRef = useRef(false);

  useEffect(() => {
    if (!user || !db || syncInitiatedRef.current) return;
    syncInitiatedRef.current = true;

    const userRef = doc(db, 'users', user.uid);
    const savedMessagesRoomId = `saved_${user.uid}`;
    const savedMessagesRef = doc(db, 'chatRooms', savedMessagesRoomId);
    
    const syncProfile = async () => {
      try {
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
          const username = user.displayName || user.email?.split('@')[0] || 'kith_user';
          const initialData = {
            id: user.uid,
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            username: username,
            usernameLowercase: username.toLowerCase(),
            profilePictureUrl: user.photoURL || '',
            bio: '',
            onlineStatus: true,
            hasSeenTutorial: false,
            blockedUserIds: [],
            lastActiveAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          setDocumentNonBlocking(userRef, initialData, { merge: true });
        } else {
          updateDocumentNonBlocking(userRef, {
            onlineStatus: true,
            lastActiveAt: serverTimestamp(),
          });
        }

        const savedSnap = await getDoc(savedMessagesRef);
        if (!savedSnap.exists()) {
          setDocumentNonBlocking(savedMessagesRef, {
            id: savedMessagesRoomId,
            name: "Saved Messages",
            nameLowercase: "saved messages",
            isGroupChat: false,
            isSavedMessages: true,
            memberIds: [user.uid],
            members: { [user.uid]: true },
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessageText: 'Your personal space for notes.',
          }, { merge: true });
        }
      } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path,
          operation: 'get',
        }));
      }
    };

    syncProfile();

    heartbeatIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateDocumentNonBlocking(userRef, {
          lastActiveAt: serverTimestamp(),
          onlineStatus: true
        });
      }
    }, 30000);

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      updateDocumentNonBlocking(userRef, {
        onlineStatus: isVisible,
        lastActiveAt: serverTimestamp()
      });
    };

    const handleBeforeUnload = () => {
      // Use standard firestore updateDoc for reliable synchronous-like behavior on unload
      updateDoc(userRef, { 
        onlineStatus: false, 
        lastActiveAt: serverTimestamp() 
      }).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [user?.uid, db]);

  return null;
}
