'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/ui/brand-logo';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

/**
 * Aesthetic Error Boundary for the Kith application.
 * Catches runtime errors in the app router and displays a user-friendly branded crash screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for developer visibility
    console.error('App Crash Captured:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative overflow-hidden transition-colors duration-500">
      {/* Dynamic Background Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-destructive/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-10 text-center animate-in fade-in zoom-in-95 duration-700">
        <div className="relative group">
          <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full scale-150 opacity-50 group-hover:opacity-100 transition-opacity" />
          <BrandLogo size="lg" showText={false} className="opacity-30 grayscale contrast-125" />
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle className="h-14 w-14 text-destructive drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-foreground leading-none">
            Something Went Wrong
          </h1>
          <div className="space-y-2">
            <p className="text-sm font-bold text-muted-foreground/80 uppercase tracking-[0.2em]">
              Kith encountered a critical error
            </p>
            <p className="text-base text-foreground font-medium leading-relaxed px-4">
              Please clear the cache and storage of this website. I am sorry for the inconvenience.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-[300px]">
          <Button 
            onClick={() => reset()} 
            className="h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-2xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em]"
          >
            <RefreshCcw className="h-4 w-4" />
            Restart Application
          </Button>
          
          <div className="pt-8 border-t border-white/5">
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.3em] font-bold">
              Connecting You Simply • Error Resilience
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
