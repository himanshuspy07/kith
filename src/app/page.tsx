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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background relative overflow-hidden transition-colors duration-500">
        {/* Animated Background Accents */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px] animate-bounce duration-[10s]" />
        
        <div className="flex flex-col items-center gap-8 relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="relative">
            <BrandLogo size="lg" showText={false} className="animate-pulse scale-110" />
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full -z-10 animate-ping opacity-20" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic text-foreground">kith</h1>
            <div className="flex items-center gap-2 text-muted-foreground/40 text-[10px] uppercase tracking-[0.3em] font-bold">
              <Loader2 className="h-3 w-3 animate-spin" />
              Initializing Workspace
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <p className="text-[9px] text-muted-foreground/20 uppercase tracking-[0.5em] font-bold">Connecting You Simply</p>
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
            <Button className="w-full h-14 rounded-2xl bg-primary font-bold shadow-xl shadow-primary/20" onClick={handleManualRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" /> I've Verified
            </Button>
            <Button variant="outline" disabled={isResending} className="w-full h-14 rounded-2xl border-white/10" onClick={handleResendVerification}>
              {isResending ? <RefreshCw className="animate-spin h-4 w-4" /> : 'Resend Email'}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full h-12 text-muted-foreground hover:bg-white/5">
                  <LogOut className="mr-2 h-3 w-3" /> Sign Out
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2rem] border-none bg-card/95 backdrop-blur-xl p-8 max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-bold">Sign Out?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    Are you sure you want to exit? You can finish your verification later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 gap-3">
                  <AlertDialogCancel className="rounded-xl border-white/10 h-12">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12 font-bold"
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
