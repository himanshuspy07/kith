"use client";

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export default function BrandLogo({ className, iconClassName, size = 'md', showText = true }: BrandLogoProps) {
  const sizeMap = {
    sm: 'h-8 w-8 rounded-lg',
    md: 'h-12 w-12 rounded-xl',
    lg: 'h-24 w-24 rounded-[2rem]',
    xl: 'h-32 w-32 rounded-[2.5rem]'
  };

  const textMap = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-7xl'
  };

  return (
    <div className={cn("flex items-center gap-5", className)}>
      <div className={cn(
        "relative flex items-center justify-center bg-gradient-to-tr from-primary via-primary to-accent shadow-[0_10px_40px_-10px_rgba(59,130,246,0.5)] border border-white/20 transition-transform hover:scale-105 duration-500",
        sizeMap[size],
        iconClassName
      )}>
        <MessageSquare className={cn(
          "text-white fill-white/10 drop-shadow-md",
          size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : size === 'lg' ? 'h-12 w-12' : 'h-16 w-16'
        )} />
        {/* Aesthetic Presence Dot */}
        <div className={cn(
          "absolute rounded-full bg-accent border-[3px] border-white dark:border-background shadow-lg animate-pulse",
          size === 'sm' ? '-top-0.5 -right-0.5 h-2.5 w-2.5' : 
          size === 'md' ? '-top-1 -right-1 h-4 w-4' : 
          size === 'lg' ? '-top-2 -right-2 h-7 w-7' : 
          '-top-3 -right-3 h-9 w-9'
        )} />
      </div>
      {showText && (
        <span className={cn("font-black tracking-tighter text-foreground uppercase italic", textMap[size])}>
          kith
        </span>
      )}
    </div>
  );
}
