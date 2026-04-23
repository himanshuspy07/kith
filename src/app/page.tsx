"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import AuthScreen from '@/components/auth/AuthScreen';
import UserProfileSync from '@/components/chat/UserProfileSync';
import CallManager from '@/components/chat/CallManager';
import { useUser } from '@/firebase';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20 border-2 border-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Kith...</p>
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
      <CallManager />
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
