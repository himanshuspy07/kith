
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
    
    // Construct sync data safely
    // We only include username and photoURL if they are provided by the Auth provider
    // to avoid overwriting custom profiles set in the app with 'null'
    const initialSyncData: any = {
      id: user.uid,
      email: user.email,
      onlineStatus: true,
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only set these if the Auth object actually has them
    if (user.displayName) initialSyncData.username = user.displayName;
    if (user.photoURL) initialSyncData.profilePictureUrl = user.photoURL;

    // Use set with merge: true to ensure the document exists without overwriting 
    // fields we didn't include in initialSyncData
    setDocumentNonBlocking(userRef, initialSyncData, { merge: true });

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
