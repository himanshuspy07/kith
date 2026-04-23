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
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  const textMap = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20",
        sizeMap[size],
        iconClassName
      )}>
        <MessageSquare className={cn(
          "text-primary-foreground fill-primary-foreground/10",
          size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-5 w-5' : size === 'lg' ? 'h-8 w-8' : 'h-12 w-12'
        )} />
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent border-2 border-background animate-pulse" />
      </div>
      {showText && (
        <span className={cn("font-bold tracking-tighter text-foreground", textMap[size])}>
          Kith
        </span>
      )}
    </div>
  );
}
