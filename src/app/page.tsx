
"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import AuthScreen from '@/components/auth/AuthScreen';
import UserProfileSync from '@/components/chat/UserProfileSync';
import NotificationManager from '@/components/chat/NotificationManager';
import BrandLogo from '@/components/ui/brand-logo';
import { useUser } from '@/firebase';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const isMobile = useIsMobile();

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700 relative z-10">
          <BrandLogo size="lg" showText={false} className="animate-bounce" />
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tighter">Kith</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.3em] font-medium animate-pulse">Initializing...</p>
          </div>
        </div>

        {/* Animated Footer */}
        <div className="absolute bottom-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 fill-mode-forwards opacity-0">
          <div className="flex flex-col items-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-border to-transparent mb-2" />
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.4em] font-bold">
              Made by <span className="text-primary animate-pulse transition-all hover:text-accent">Himanshu Yadav</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Mobile navigation logic: 
  // - Show Sidebar if no conversation is selected
  // - Show ChatWindow if a conversation is selected
  const showSidebar = !isMobile || !selectedConversationId;
  const showChat = !isMobile || !!selectedConversationId;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <UserProfileSync />
      <NotificationManager currentConversationId={selectedConversationId} />
      
      {showSidebar && (
        <Sidebar 
          onSelectConversation={setSelectedConversationId} 
          selectedConversationId={selectedConversationId} 
          className={cn(isMobile ? "w-full" : "w-80")}
        />
      )}
      
      {showChat && (
        <main className="flex-1 h-full flex flex-col">
          <ChatWindow 
            conversationId={selectedConversationId} 
            onBack={isMobile ? () => setSelectedConversationId(undefined) : undefined}
          />
        </main>
      )}
    </div>
  );
}
