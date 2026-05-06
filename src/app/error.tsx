
'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/ui/brand-logo';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

/**
 * Aesthetic Error Boundary for the Kith application.
 * Catches runtime errors and provides a deep reset of workspace storage and cache.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Crash Captured:', error);
  }, [error]);

  const handleReset = () => {
    // Clear local storage, session storage, and browser caches
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.keys().then((names) => {
          names.forEach(name => caches.delete(name));
        });
      }
    } catch (e) {
      console.warn('Failed to clear some storage during reset:', e);
    }

    // Attempt programmatic reset or fallback to hard reload
    if (typeof reset === 'function') {
      try {
        reset();
      } catch (e) {
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-destructive/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-10 text-center animate-in-fade">
        <div className="relative group">
          <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full scale-150 opacity-50" />
          <BrandLogo size="lg" showText={false} className="opacity-30 grayscale contrast-125" />
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle className="h-14 w-14 text-destructive drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-foreground leading-none">
            Workspace Error
          </h1>
          <div className="space-y-2">
            <p className="text-sm font-bold text-muted-foreground/80 uppercase tracking-[0.2em]">
              System failure detected
            </p>
            <p className="text-base text-foreground font-medium leading-relaxed px-4">
              Kith encountered an issue. Resetting will clear your local cache and restart the session.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-[300px]">
          <Button 
            onClick={handleReset} 
            className="h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-2xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em]"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset Workspace
          </Button>
        </div>
      </div>
    </div>
  );
}
