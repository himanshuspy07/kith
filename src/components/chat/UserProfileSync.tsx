
"use client";

import { useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Handles initializing and updating the user's Firestore profile.
 * Updates online status and last active timestamp.
 */
export default function UserProfileSync() {
  const { user } = useUser();
  const db = useFirestore();

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
      createdAt: serverTimestamp(), // Will be ignored if merge: true and doc exists
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Handle offline status on unmount (best effort)
    return () => {
      setDocumentNonBlocking(userRef, {
        onlineStatus: false,
        lastActiveAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    };
  }, [user, db]);

  return null;
}
