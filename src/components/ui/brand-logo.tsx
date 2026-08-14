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
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-32 w-32',
    xl: 'h-48 w-48'
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
        "relative flex items-center justify-center transition-all duration-700 hover:rotate-6",
        sizeMap[size],
        iconClassName
      )}>
        <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
          <defs>
            <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C5B3FF" stopOpacity={1} />
              <stop offset="100%" stopColor="#FFB5A7" stopOpacity={1} />
            </linearGradient>
            <filter id="clayShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur"/>
              <feOffset in="blur" dx="5" dy="5" result="offsetBlur"/>
              <feSpecularLighting in="blur" surfaceScale="8" specularConstant="1.2" specularExponent="40" lightingColor="#ffffff" result="specOut">
                <fePointLight x="-5000" y="-10000" z="20000"/>
              </feSpecularLighting>
              <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut"/>
              <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint"/>
            </filter>
          </defs>
          <circle cx="256" cy="256" r="230" fill="url(#logoBg)" />
          {/* Bubble Character Body */}
          <path d="M256 180C195 180 145 230 145 295C145 360 195 410 256 410C317 410 367 360 367 295C367 230 317 180 256 180Z" fill="#8CFFD1" filter="url(#clayShadow)"/>
          {/* Antennae forming "K" */}
          <path d="M230 100V170M230 135L265 100M230 135L265 170" stroke="#FFFFFF" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M280 100V170M280 135L315 100M280 135L315 170" stroke="#FFFFFF" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
          {/* Friendly Face */}
          <circle cx="215" cy="290" r="9" fill="#5A4B81" />
          <circle cx="297" cy="290" r="9" fill="#5A4B81" />
          <path d="M245 330C245 330 256 340 267 330" stroke="#5A4B81" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>
      {showText && (
        <span className={cn("kith-text", textMap[size])}>
          kith
        </span>
      )}
    </div>
  );
}
