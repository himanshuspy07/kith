
"use client";

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lock, Unlock, Delete, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/ui/brand-logo';

/**
 * AppLockOverlay protects the application content behind a 4-digit PIN.
 * It only shows if the user has enabled 'appLockEnabled' in their settings.
 */
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

  // Check session storage to see if we've already unlocked in this session
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
          if (user?.uid) {
            sessionStorage.setItem(`kith_unlocked_${user.uid}`, 'true');
          }
        } else {
          setError(true);
          setTimeout(() => setPin(''), 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  // If user hasn't enabled lock, or they've already unlocked, show the app
  if (!userData?.appLockEnabled || isUnlocked) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center p-6 overflow-hidden">
      {/* Aesthetic Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[160px] pointer-events-none" />
      
      <Card className="w-full max-w-sm border-none bg-transparent shadow-none flex flex-col items-center gap-12 relative z-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandLogo size="md" showText={false} className="mb-4" />
          <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-2 border border-primary/20">
            {error ? (
              <Lock className="h-8 w-8 text-destructive animate-bounce" />
            ) : (
              <Lock className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic">App Locked</h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Enter 4-digit PIN</p>
          </div>
        </div>

        {/* PIN Indicators */}
        <div className="flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={cn(
                "h-4 w-4 rounded-full border-2 transition-all duration-300",
                pin.length > i 
                  ? (error ? "bg-destructive border-destructive scale-110" : "bg-primary border-primary scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]") 
                  : "border-muted-foreground/30 bg-transparent"
              )} 
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full px-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <Button 
              key={num}
              variant="ghost"
              onClick={() => handleKeyPress(num)}
              className="h-16 rounded-2xl text-xl font-bold hover:bg-white/5 active:scale-90 transition-all border border-transparent hover:border-white/10"
            >
              {num}
            </Button>
          ))}
          <div />
          <Button 
            variant="ghost"
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-2xl text-xl font-bold hover:bg-white/5 active:scale-90 transition-all border border-transparent hover:border-white/10"
          >
            0
          </Button>
          <Button 
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="h-16 w-full rounded-2xl hover:bg-white/5 active:scale-90 transition-all text-muted-foreground"
          >
            <Delete className="h-6 w-6" />
          </Button>
        </div>

        {error && (
          <p className="text-[10px] font-bold text-destructive uppercase tracking-widest animate-in fade-in zoom-in-95">
            Incorrect PIN. Please try again.
          </p>
        )}
      </Card>
    </div>
  );
}
