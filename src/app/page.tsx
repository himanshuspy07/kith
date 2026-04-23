"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import AuthScreen from '@/components/auth/AuthScreen';
import UserProfileSync from '@/components/chat/UserProfileSync';
import BrandLogo from '@/components/ui/brand-logo';
import { useUser } from '@/firebase';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <BrandLogo size="lg" showText={false} className="animate-bounce" />
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tighter">Kith</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.3em] font-medium animate-pulse">Initializing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <UserProfileSync />
      <Sidebar 
        onSelectConversation={setSelectedConversationId} 
        selectedConversationId={selectedConversationId} 
      />
      <main className="flex-1 h-full flex flex-col">
        <ChatWindow conversationId={selectedConversationId} />
      </main>
    </div>
  );
}
