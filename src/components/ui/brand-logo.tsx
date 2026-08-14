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
        <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
          {/* Snapchat-style rounded square - Now Black */}
          <rect width="512" height="512" rx="140" fill="black" />
          
          {/* Character Body - Now White */}
          <path 
            d="M256 140C200 140 160 190 160 250C160 310 200 360 256 360C312 360 352 310 352 250C352 190 312 140 256 140Z" 
            fill="white" 
          />
          
          {/* Single Antennae 'K' */}
          <path 
            d="M256 60V140M256 100L296 60M256 100L296 140" 
            stroke="white" 
            strokeWidth="24" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* Face */}
          <circle cx="225" cy="245" r="10" fill="black" />
          <circle cx="287" cy="245" r="10" fill="black" />
          <path d="M245 285C245 285 256 295 267 285" stroke="black" strokeWidth="5" strokeLinecap="round" />
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
