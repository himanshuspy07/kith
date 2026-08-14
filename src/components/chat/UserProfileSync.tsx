
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
 * Ensures custom profile data (username, avatar) isn't overwritten on refresh.
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
    
    const syncProfile = async () => {
      getDoc(userRef)
        .then((docSnap) => {
          if (!docSnap.exists()) {
            // First time initialization
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
              lastActiveAt: serverTimestamp(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            setDocumentNonBlocking(userRef, initialData, { merge: true });
          } else {
            // Update presence ONLY
            const updates: any = {
              onlineStatus: true,
              lastActiveAt: serverTimestamp(),
            };
            updateDocumentNonBlocking(userRef, updates);
          }
        })
        .catch((error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'get',
          }));
        });
    };

    syncProfile();

    // Fast Heartbeat every 30 seconds for better real-time feel
    heartbeatIntervalRef.current = setInterval(() => {
      updateDocumentNonBlocking(userRef, {
        lastActiveAt: serverTimestamp(),
        onlineStatus: true
      });
    }, 1000 * 30);

    // Handle visibility changes for more immediate status updates
    const handleVisibilityChange = () => {
      const status = document.visibilityState === 'visible';
      updateDocumentNonBlocking(userRef, {
        onlineStatus: status,
        lastActiveAt: serverTimestamp()
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Try to mark offline on unmount
      updateDoc(userRef, {
        onlineStatus: false,
        lastActiveAt: serverTimestamp()
      }).catch(() => {});
    };
  }, [user?.uid, db]);

  return null;
}
