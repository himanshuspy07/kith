'use client';

import React from 'react';
import BrandLogo from '@/components/ui/brand-logo';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

/**
 * Root level error fallback for Next.js.
 * This is triggered if an error occurs in the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const handleReset = () => {
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
    <html lang="en">
      <body className="antialiased bg-background text-foreground font-body overflow-hidden">
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-background relative">
           <div className="absolute inset-0 bg-destructive/5 blur-[150px] rounded-full scale-150" />
           
           <div className="relative z-10 flex flex-col items-center gap-8">
             <BrandLogo size="lg" className="mb-4 opacity-50 grayscale" />
             <div className="h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-2 border border-destructive/20">
               <AlertTriangle className="h-10 w-10 text-destructive" />
             </div>
             
             <div className="space-y-4 max-w-md">
               <h1 className="text-2xl font-black uppercase italic tracking-tighter">Critical Failure</h1>
               <p className="text-muted-foreground font-medium leading-relaxed text-sm">
                 Kith encountered an issue in the root system. Please clear your cache or try resetting the workspace below.
               </p>
             </div>

             <button 
               onClick={handleReset}
               className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 uppercase text-[10px] tracking-widest"
             >
               <RefreshCcw className="h-4 w-4" />
               Reset System
             </button>
             
             <div className="pt-8 opacity-20">
               <p className="text-[9px] uppercase tracking-[0.4em] font-bold">Connecting You Simply</p>
             </div>
           </div>
        </div>
      </body>
    </html>
  );
}