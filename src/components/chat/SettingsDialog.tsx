"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Bell, Smartphone, Copy, Check, Shield, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { getMessaging, getToken } from 'firebase/messaging';

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
    }, 500);
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
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card border-white/5 rounded-[2rem]">
        <div className="bg-primary/10 p-8 flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-xl bg-primary/20 text-primary">
              {username?.[0] || user?.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{username || 'User Profile'}</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">{user?.email}</p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <div className="px-8 pt-4">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 h-12 rounded-xl">
              <TabsTrigger value="profile" className="rounded-lg gap-2">
                <User className="h-4 w-4" /> Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-lg gap-2">
                <Bell className="h-4 w-4" /> Notifications
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8">
            <TabsContent value="profile" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-primary tracking-widest">Username</Label>
                <Input 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="e.g. Alex" 
                  className="bg-white/5 border-none h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-primary tracking-widest">Bio</Label>
                <Textarea 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  placeholder="Tell others about yourself..." 
                  className="bg-white/5 border-none rounded-xl min-h-[100px] resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-primary tracking-widest">Avatar URL</Label>
                <Input 
                  value={avatarUrl} 
                  onChange={(e) => setAvatarUrl(e.target.value)} 
                  placeholder="https://..." 
                  className="bg-white/5 border-none h-12 rounded-xl"
                />
              </div>
              <Button 
                onClick={handleSaveProfile} 
                disabled={isSaving} 
                className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs mt-4"
              >
                {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save Profile'}
              </Button>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6 mt-0">
              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-bold text-primary tracking-widest">Alert Settings</Label>
                <Button variant="outline" className="w-full justify-start gap-3 h-14 rounded-xl border-white/5 hover:bg-white/5" onClick={handleRequestNotifications}>
                  <Bell className="h-5 w-5 text-primary" />
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-bold">Request Permission</span>
                    <span className="text-[10px] text-muted-foreground">Enable browser system alerts</span>
                  </div>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-14 rounded-xl border-white/5 hover:bg-white/5" onClick={sendTestNotification}>
                  <Smartphone className="h-5 w-5 text-accent" />
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-bold">Send Test Alert</span>
                    <span className="text-[10px] text-muted-foreground">Verify foreground notifications</span>
                  </div>
                </Button>
              </div>
              
              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-bold text-primary tracking-widest">Developer Tools</Label>
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl text-xs hover:bg-white/5" onClick={copyDebugToken}>
                  {copiedToken ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                  {copiedToken ? 'Token Copied!' : 'Copy FCM Device Token'}
                </Button>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-2 opacity-30">
                <Shield className="h-3 w-3" />
                <span className="text-[9px] uppercase font-bold tracking-widest">kith secure connection active</span>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}