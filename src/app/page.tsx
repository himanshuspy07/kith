
"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import AuthScreen from '@/components/auth/AuthScreen';
import UserProfileSync from '@/components/chat/UserProfileSync';
import NotificationManager from '@/components/chat/NotificationManager';
import AppTutorial from '@/components/chat/AppTutorial';
import BrandLogo from '@/components/ui/brand-logo';
import { useUser, useAuth } from '@/firebase';
import { initiateResendVerification } from '@/firebase/non-blocking-login';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, RefreshCw, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleResendVerification = async () => {
    if (!user) return;
    setIsResending(true);
    try {
      await initiateResendVerification(user);
      toast({
        title: "Verification sent",
        description: "Check your inbox for a new verification link.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!user) return;
    await user.reload();
    window.location.reload(); 
  };

  if (isUserLoading || !hasMounted) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="flex flex-col items-center gap-6 relative z-10">
          <BrandLogo size="lg" showText={false} className="animate-bounce" />
          <h1 className="text-2xl font-bold tracking-tighter">kith</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <Card className="w-full max-w-md border-white/5 bg-white/5 backdrop-blur-3xl shadow-2xl relative z-10 rounded-[2.5rem] p-10 text-center flex flex-col items-center gap-6">
          <div className="h-20 w-20 rounded-3xl bg-primary/20 flex items-center justify-center mb-2">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
            <CardDescription>
              Please verify your email <span className="text-foreground font-bold">{user.email}</span> to continue.
            </CardDescription>
          </div>
          <div className="w-full space-y-3 pt-4">
            <Button className="w-full h-14 rounded-2xl bg-primary font-bold" onClick={handleManualRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" /> I've Verified
            </Button>
            <Button variant="outline" disabled={isResending} className="w-full h-14 rounded-2xl" onClick={handleResendVerification}>
              {isResending ? <RefreshCw className="animate-spin h-4 w-4" /> : 'Resend Email'}
            </Button>
            <Button variant="ghost" className="w-full h-12 text-muted-foreground" onClick={() => signOut(auth)}>
              <LogOut className="mr-2 h-3 w-3" /> Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const showSidebar = !isMobile || !selectedConversationId;
  const showChat = !isMobile || !!selectedConversationId;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <UserProfileSync />
      <NotificationManager currentConversationId={selectedConversationId} />
      <AppTutorial />
      
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
