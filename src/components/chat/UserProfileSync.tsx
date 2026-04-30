
"use client";

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, serverTimestamp, getDoc } from 'firebase/firestore';
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

  useEffect(() => {
    if (!user || !db) return;

    const userRef = doc(db, 'users', user.uid);
    
    const syncProfile = async () => {
      getDoc(userRef)
        .then((docSnap) => {
          if (!docSnap.exists()) {
            // First time initialization: use Auth provider defaults
            const initialData = {
              id: user.uid,
              email: user.email || '',
              phoneNumber: user.phoneNumber || '',
              username: user.displayName || user.email?.split('@')[0] || 'User',
              profilePictureUrl: user.photoURL || '',
              onlineStatus: true,
              lastActiveAt: serverTimestamp(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            setDocumentNonBlocking(userRef, initialData, { merge: true });
          } else {
            // Profile exists: only update presence to avoid overwriting custom data
            updateDocumentNonBlocking(userRef, {
              onlineStatus: true,
              lastActiveAt: serverTimestamp(),
            });
          }
        })
        .catch((error) => {
          // Surfacing rich permission errors for development
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'get',
          }));
        });
    };

    syncProfile();

    // Periodic heartbeat to keep presence accurate
    heartbeatIntervalRef.current = setInterval(() => {
      updateDocumentNonBlocking(userRef, {
        lastActiveAt: serverTimestamp(),
        onlineStatus: true
      });
    }, 1000 * 60); // Every minute

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [user, db]);

  return null;
}
