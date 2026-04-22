
"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';

export default function Home() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
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
