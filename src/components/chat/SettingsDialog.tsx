"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Bell, Smartphone, Copy, Check, Shield, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { getMessaging, getToken } from 'firebase/messaging';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VAPID_KEY = "BCg1UIFx2xNkxfPrxSeATRRO2jyjVh2c2C_9AEfN3FsbTFjcS3EN5fyF3qIDsWbSt5RN_L4UpGWlq4QTuBJwplE";

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (!user || !db || !open) return;

    const fetchProfile = async () => {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setUsername(data.username || '');
        setBio(data.bio || '');
        setAvatarUrl(data.profilePictureUrl || '');
      }
    };

    fetchProfile();
  }, [user, db, open]);

  const handleSaveProfile = async () => {
    if (!user || !db) return;
    setIsSaving(true);

    const userRef = doc(db, 'users', user.uid);
    updateDocumentNonBlocking(userRef, {
      username,
      usernameLowercase: username.toLowerCase(),
      bio,
      profilePictureUrl: avatarUrl,
      updatedAt: serverTimestamp(),
    });

    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });
    }, 600);
  };

  const handleRequestNotifications = async () => {
    if (!("Notification" in window)) {
      toast({ variant: "destructive", title: "Not Supported", description: "Browser notifications not supported." });
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast({ title: "Notifications Enabled", description: "You'll receive alerts for new messages." });
    }
  };

  const sendTestNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification("kith Test", {
        body: "This is a test notification. Persistent alerts are active!",
        icon: "/icon.svg"
      });
      toast({ title: "Test Sent", description: "Check your notification center." });
    } else {
      toast({ variant: "destructive", title: "Permission Required", description: "Enable notifications first." });
    }
  };

  const copyDebugToken = async () => {
    try {
      const messaging = getMessaging();
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
        await navigator.clipboard.writeText(token);
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
        toast({ title: "Token Copied", description: "Device token ready for manual push testing." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to get token" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-card border-white/5 rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-0">
          <div className="relative h-40 bg-gradient-to-b from-black/40 to-transparent border-b border-white/5 flex items-end px-8 pb-0">
            <div className="absolute top-6 right-6 flex gap-2">
               <div className="px-3 py-1 rounded-full bg-primary/10 backdrop-blur-md border border-primary/20 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Pro Account</span>
               </div>
            </div>
            <div className="flex items-center gap-6 translate-y-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-2xl ring-1 ring-white/10">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-3xl bg-primary/20 text-primary font-black uppercase">
                    {username?.[0] || user?.email?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <ImageIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex flex-col text-left mb-6">
                <DialogTitle className="text-2xl font-black tracking-tighter text-white">Settings</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">
                  Manage your kith identity
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-12 px-8 pb-10">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 h-12 p-1 rounded-2xl mb-8">
              <TabsTrigger value="profile" className="rounded-xl gap-2 font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <User className="h-3.5 w-3.5" /> Identity
              </TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-xl gap-2 font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bell className="h-3.5 w-3.5" /> Presence
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-0 bg-transparent animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid gap-6">
                <div className="space-y-2.5">
                  <Label className="text-[10px] uppercase font-black text-primary tracking-widest ml-1">Username</Label>
                  <Input 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    placeholder="How should we call you?" 
                    className="bg-muted/30 border-none h-14 rounded-2xl px-6 focus-visible:ring-primary/30 text-sm font-medium"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[10px] uppercase font-black text-primary tracking-widest ml-1">Personal Bio</Label>
                  <Textarea 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    placeholder="Tell your kith a bit about yourself..." 
                    className="bg-muted/30 border-none rounded-2xl p-6 min-h-[120px] resize-none focus-visible:ring-primary/30 text-sm font-medium leading-relaxed"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[10px] uppercase font-black text-primary tracking-widest ml-1">Profile Picture URL</Label>
                  <Input 
                    value={avatarUrl} 
                    onChange={(e) => setAvatarUrl(e.target.value)} 
                    placeholder="Paste a link to your image" 
                    className="bg-muted/30 border-none h-14 rounded-2xl px-6 focus-visible:ring-primary/30 text-sm font-medium"
                  />
                </div>
              </div>
              <Button 
                onClick={handleSaveProfile} 
                disabled={isSaving} 
                className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-primary/20 transition-all active:scale-95 mt-2"
              >
                {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : 'Apply Changes'}
              </Button>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-8 mt-0 bg-transparent animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black text-primary tracking-widest ml-1">System Alerts</Label>
                <div className="grid gap-3">
                  <Button variant="outline" className="w-full justify-start gap-4 h-20 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all group" onClick={handleRequestNotifications}>
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Bell className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-black text-white">Push Notifications</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5 font-bold">Stay connected in background</span>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start gap-4 h-20 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all group" onClick={sendTestNotification}>
                    <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Smartphone className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-black text-white">Send Test Alert</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5 font-bold">Verify delivery pipeline</span>
                    </div>
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black text-primary tracking-widest ml-1">Developer & Support</Label>
                <Button variant="ghost" className="w-full justify-between h-14 rounded-2xl px-6 text-xs hover:bg-white/5 group border border-dashed border-white/10" onClick={copyDebugToken}>
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold text-muted-foreground uppercase tracking-widest">Device Token</span>
                  </div>
                  {copiedToken ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />}
                </Button>
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-2.5 opacity-40">
                <Shield className="h-3 w-3 text-accent" />
                <span className="text-[9px] uppercase font-black tracking-[0.3em] text-white">kith security standard v2.0</span>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
