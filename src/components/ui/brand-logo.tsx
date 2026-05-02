
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
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-20 w-20',
    xl: 'h-28 w-28'
  };

  const textMap = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-7xl'
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className={cn(
        "relative flex items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-primary via-primary to-accent shadow-2xl shadow-primary/30",
        sizeMap[size],
        iconClassName
      )}>
        <MessageSquare className={cn(
          "text-primary-foreground fill-primary-foreground/20",
          size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-14 w-14'
        )} />
        <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-accent border-4 border-background shadow-lg" />
      </div>
      {showText && (
        <span className={cn("font-black tracking-tighter text-foreground uppercase italic", textMap[size])}>
          kithofficial
        </span>
      )}
    </div>
  );
}
