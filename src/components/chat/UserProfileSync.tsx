
"use client";

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Handles initializing and updating the user's Firestore profile.
 * Updates online status and last active timestamp.
 */
export default function UserProfileSync() {
  const { user } = useUser();
  const db = useFirestore();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !db) return;

    const userRef = doc(db, 'users', user.uid);
    
    // Initialize/Update user profile
    setDocumentNonBlocking(userRef, {
      id: user.uid,
      username: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      email: user.email,
      profilePictureUrl: user.photoURL,
      onlineStatus: true,
      lastActiveAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

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
