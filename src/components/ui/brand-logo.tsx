"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export default function BrandLogo({ className, iconClassName, size = 'md', showText = true }: BrandLogoProps) {
  const sizeMap = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-24 w-24',
    xl: 'h-40 w-48'
  };

  const textMap = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-7xl'
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "relative flex items-center justify-center transition-all duration-300",
        sizeMap[size],
        iconClassName
      )}>
        <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
          {/* Blue Chat Bubble */}
          <path 
            d="M448 256C448 362.039 362.039 448 256 448C218.468 448 183.567 437.228 154.108 418.667L64 448L93.3333 357.892C74.772 328.433 64 293.532 64 256C64 149.961 149.961 64 256 64C362.039 64 448 149.961 448 256Z" 
            fill="#00ADFF" 
          />
          {/* Black K */}
          <path 
            d="M210 160V352M210 256L300 160M235 256L342 352" 
            stroke="black" 
            strokeWidth="54" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>
      {showText && (
        <span className={cn("kith-text tracking-tighter italic font-black text-foreground", textMap[size])}>
          KITH
        </span>
      )}
    </div>
  );
}