"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import AuthScreen from '@/components/auth/AuthScreen';
import UserProfileSync from '@/components/chat/UserProfileSync';
import NotificationManager from '@/components/chat/NotificationManager';
import AppTutorial from '@/components/chat/AppTutorial';
import AppLockOverlay from '@/components/chat/AppLockOverlay';
import ProfileView from '@/components/chat/ProfileView';
import SettingsView from '@/components/chat/SettingsView';
import BrandLogo from '@/components/ui/brand-logo';
import { useUser } from '@/firebase';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { MessageSquare, User, Settings as SettingsIcon } from 'lucide-react';

type NavigationTab = 'chat' | 'profile' | 'settings';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState<NavigationTab>('chat');
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (isUserLoading || !hasMounted) {
    return (
      <div className="flex h-svh w-full flex-col items-center justify-center bg-[#121212] relative overflow-hidden">
        {/* Animated Background Glow */}
        <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full animate-pulse pointer-events-none" />
        
        <div className="flex flex-col items-center gap-8 animate-in zoom-in-95 duration-700">
          <BrandLogo size="lg" showText={false} className="scale-125 drop-shadow-[0_0_25px_rgba(0,173,255,0.3)]" />
          
          <div className="flex flex-col items-center gap-2">
            <h2 className="kith-text text-2xl tracking-[0.2em] animate-in slide-in-from-bottom-4 duration-1000">KITH</h2>
            <div className="flex items-center gap-2 overflow-hidden h-6">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary animate-in slide-in-from-top-4 duration-700 opacity-60">
                Made by Himanshu
              </p>
            </div>
          </div>
        </div>

        {/* Loading Progress Dot */}
        <div className="absolute bottom-12 flex gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Handle mobile full-screen chat with explicit height lock
  if (isMobile && selectedConversationId) {
    return (
      <AppLockOverlay>
        <div className="h-svh w-full overflow-hidden flex flex-col bg-background">
          <ChatWindow 
            conversationId={selectedConversationId} 
            onBack={() => setSelectedConversationId(undefined)}
          />
        </div>
      </AppLockOverlay>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <div className="flex flex-1 h-full overflow-hidden">
            <Sidebar 
              onSelectConversation={setSelectedConversationId} 
              selectedConversationId={selectedConversationId} 
              className={cn(isMobile ? "w-full" : "w-80 md:w-96 border-r border-border/40")}
            />
            {!isMobile && (
              <main className="flex-1 h-full flex flex-col min-w-0">
                <ChatWindow 
                  conversationId={selectedConversationId} 
                />
              </main>
            )}
          </div>
        );
    }
  };

  return (
    <AppLockOverlay>
      <div className="flex h-svh w-full bg-background flex-col overflow-hidden">
        <UserProfileSync />
        <NotificationManager currentConversationId={selectedConversationId} />
        <AppTutorial />
        
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {renderActiveView()}
        </div>

        {/* Snapchat-style Bottom Navigation */}
        <nav className="h-20 bg-background border-t border-border/40 px-6 flex items-center justify-around z-50 shrink-0">
          <button 
            onClick={() => setActiveTab('profile')}
            className="flex flex-col items-center gap-1 transition-all py-2"
          >
            <User className={cn("h-7 w-7", activeTab === 'profile' ? "text-primary fill-current" : "text-muted-foreground hover:text-foreground")} />
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", activeTab === 'profile' ? "text-primary" : "text-muted-foreground")}>Profile</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('chat')}
            className="flex flex-col items-center gap-1 transition-all py-2"
          >
            <MessageSquare className={cn("h-7 w-7", activeTab === 'chat' ? "text-secondary fill-current" : "text-muted-foreground hover:text-foreground")} />
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", activeTab === 'chat' ? "text-secondary" : "text-muted-foreground")}>Chat</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className="flex flex-col items-center gap-1 transition-all py-2"
          >
            <SettingsIcon className={cn("h-7 w-7", activeTab === 'settings' ? "text-foreground fill-current" : "text-muted-foreground hover:text-foreground")} />
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", activeTab === 'settings' ? "text-foreground" : "text-muted-foreground")}>Settings</span>
          </button>
        </nav>
      </div>
    </AppLockOverlay>
  );
}
