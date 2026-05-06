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
            // First time initialization: use Auth provider defaults
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
            // Profile exists: update presence ONLY
            // We do NOT update username or profilePictureUrl here because 
            // Firestore is now the source of truth, not the initial Auth object.
            const existingData = docSnap.data();
            const updates: any = {
              onlineStatus: true,
              lastActiveAt: serverTimestamp(),
            };
            
            // Backfill legacy fields if missing, but don't overwrite if they exist
            if (!existingData.usernameLowercase && existingData.username) {
              updates.usernameLowercase = existingData.username.toLowerCase();
            }
            if (existingData.bio === undefined) updates.bio = '';
            if (existingData.hasSeenTutorial === undefined) {
              updates.hasSeenTutorial = false;
            }

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

    // Heartbeat every 60 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      updateDocumentNonBlocking(userRef, {
        lastActiveAt: serverTimestamp(),
        onlineStatus: true
      });
    }, 1000 * 60);

    // Set offline on unmount (only on real unmount, not necessarily on refresh)
    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      // We use a small delay or check for visibility to avoid setting offline during refresh
      // but for standard unmounts like logout, we want this.
      updateDoc(userRef, {
        onlineStatus: false,
        lastActiveAt: serverTimestamp()
      }).catch(() => {
        // Silent catch for unmount failures
      });
    };
  }, [user?.uid, db]); // Only depend on UID to prevent re-running if Auth user object updates fields

  return null;
}