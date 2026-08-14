"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import AuthScreen from '@/components/auth/AuthScreen';
import UserProfileSync from '@/components/chat/UserProfileSync';
import NotificationManager from '@/components/chat/NotificationManager';
import AppTutorial from '@/components/chat/AppTutorial';
import AppLockOverlay from '@/components/chat/AppLockOverlay';
import BrandLogo from '@/components/ui/brand-logo';
import { useUser, useAuth } from '@/firebase';
import { initiateResendVerification } from '@/firebase/non-blocking-login';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, RefreshCw, LogOut, Loader2 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
        {/* Triadic Loading Background */}
        <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[800px] h-[800px] bg-accent/20 rounded-full blur-[160px] animate-pulse" />
        
        <div className="flex flex-col items-center gap-12 relative z-10 animate-in fade-in zoom-in-95 duration-1000">
          <BrandLogo size="lg" showText={false} className="scale-125" />
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-6xl font-black tracking-tighter uppercase italic kith-text">kith</h1>
            <div className="flex items-center gap-3 text-primary text-[10px] uppercase font-black tracking-[0.6em]">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
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
        <Card className="w-full max-w-md border-none bg-card/50 backdrop-blur-3xl shadow-2xl relative z-10 rounded-[3rem] p-12 text-center flex flex-col items-center gap-8">
          <div className="h-24 w-24 rounded-[2rem] bg-primary/20 flex items-center justify-center">
            <Mail className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-4">
            <CardTitle className="text-3xl font-black italic tracking-tighter uppercase">Verify Email</CardTitle>
            <CardDescription className="text-sm font-medium">
              We sent a verification link to <span className="text-primary font-bold">{user.email}</span>.
            </CardDescription>
          </div>
          <div className="w-full space-y-4 pt-4">
            <Button className="w-full h-14 rounded-2xl bg-primary font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20" onClick={handleManualRefresh}>
              <RefreshCw className="mr-3 h-5 w-5" /> I've Verified
            </Button>
            <Button variant="outline" disabled={isResending} className="w-full h-14 rounded-2xl border-white/5 bg-card/50 font-bold" onClick={handleResendVerification}>
              {isResending ? <RefreshCw className="animate-spin h-5 w-5" /> : 'Resend Link'}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full h-12 text-muted-foreground/50 hover:text-destructive font-bold uppercase text-[10px] tracking-widest">
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2.5rem] border-none bg-card/95 backdrop-blur-xl p-10 max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Sign Out?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
                    Are you sure you want to leave the workspace?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-8 gap-3">
                  <AlertDialogCancel className="rounded-xl border-white/5 h-12 font-bold">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12 font-black uppercase tracking-widest"
                    onClick={() => signOut(auth)}
                  >
                    Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      </div>
    );
  }

  // Responsive logic: On mobile, only show sidebar OR chat, never both.
  const showSidebar = !isMobile || !selectedConversationId;
  const showChat = !isMobile || !!selectedConversationId;

  return (
    <AppLockOverlay>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <UserProfileSync />
        <NotificationManager currentConversationId={selectedConversationId} />
        <AppTutorial />
        
        {showSidebar && (
          <Sidebar 
            onSelectConversation={setSelectedConversationId} 
            selectedConversationId={selectedConversationId} 
            className={cn(isMobile ? "w-full" : "w-80 md:w-96")}
          />
        )}
        
        {showChat && (
          <main className="flex-1 h-full flex flex-col min-w-0">
            <ChatWindow 
              conversationId={selectedConversationId} 
              onBack={isMobile ? () => setSelectedConversationId(undefined) : undefined}
            />
          </main>
        )}
      </div>
    </AppLockOverlay>
  );
}