"use client";

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Lock, Delete, Loader2, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/ui/brand-logo';

export default function AppLockOverlay({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const db = useFirestore();
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(false);

  const userRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: userData, isLoading } = useDoc(userRef);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.uid) {
      const sessionUnlocked = sessionStorage.getItem(`kith_unlocked_${user.uid}`);
      if (sessionUnlocked === 'true') {
        setIsUnlocked(true);
      }
    }
  }, [user?.uid]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setError(false);
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        if (newPin === userData?.appLockPin) {
          setIsUnlocked(true);
          if (user?.uid) sessionStorage.setItem(`kith_unlocked_${user.uid}`, 'true');
        } else {
          setError(true);
          setTimeout(() => setPin(''), 600);
        }
      }
    }
  };

  if (!userData?.appLockEnabled || isUnlocked) return <>{children}</>;
  if (isLoading) return <div className="fixed inset-0 bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center p-6 animate-in-fade">
      <div className="w-full max-w-xs flex flex-col items-center gap-12">
        <div className="text-center space-y-6">
          <BrandLogo size="sm" showText={false} className="justify-center" />
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">Enter PIN</h2>
            <p className="text-sm text-muted-foreground">Kith is protected for your privacy</p>
          </div>
        </div>

        <div className="flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn(
              "h-3 w-3 rounded-full transition-all duration-200",
              pin.length > i ? (error ? "bg-destructive scale-125" : "bg-primary scale-125 shadow-[0_0_10px_rgba(59,130,246,0.5)]") : "bg-muted"
            )} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) => (
            key === '' ? <div key={i} /> : (
              <Button 
                key={i} 
                variant="ghost" 
                className="h-14 rounded-full text-xl font-semibold hover:bg-muted active:scale-90 transition-all"
                onClick={() => key === 'del' ? setPin(p => p.slice(0, -1)) : handleKeyPress(key)}
              >
                {key === 'del' ? <Delete className="h-5 w-5 text-muted-foreground" /> : key}
              </Button>
            )
          ))}
        </div>

        {error && <p className="text-xs font-bold text-destructive animate-in slide-in-from-top-1">Incorrect PIN. Try again.</p>}
      </div>
    </div>
  );
}