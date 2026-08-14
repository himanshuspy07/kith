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
          {/* Snapchat-style rounded square */}
          <rect width="512" height="512" rx="128" fill="#FFFC00" />
          {/* Character Body */}
          <path 
            d="M256 120C200 120 160 170 160 230C160 290 200 340 256 340C312 340 352 290 352 230C352 170 312 120 256 120Z" 
            fill="white" 
          />
          {/* Antennae K */}
          <path 
            d="M230 60V120M230 90L260 60M230 90L260 120" 
            stroke="white" 
            strokeWidth="15" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M282 60V120M282 90L312 60M282 90L312 120" 
            stroke="white" 
            strokeWidth="15" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Face */}
          <circle cx="225" cy="225" r="8" fill="black" />
          <circle cx="287" cy="225" r="8" fill="black" />
          <path d="M245 260C245 260 256 270 267 260" stroke="black" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
      {showText && (
        <span className={cn("kith-text tracking-tighter italic font-black", textMap[size])}>
          KITH
        </span>
      )}
    </div>
  );
}
