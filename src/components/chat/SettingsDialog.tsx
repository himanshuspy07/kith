
"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Bell,
  Smartphone,
  Copy,
  Check,
  Shield,
  Loader2,
  Camera,
  Settings,
  ChevronRight,
  Upload
} from 'lucide-react';
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

type SettingsTab = 'profile' | 'notifications' | 'security';

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB Limit
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
      setIsUploading(false);
      toast({
        title: "Photo Ready",
        description: "Click 'Save Changes' to update your profile.",
      });
    };
    reader.onerror = () => {
      setIsUploading(false);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not read the selected file.",
      });
    };
    reader.readAsDataURL(file);
  };

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
        description: "Your settings have been saved.",
      });
    }, 800);
  };

  const handleRequestNotifications = async () => {
    if (!("Notification" in window)) {
      toast({ variant: "destructive", title: "Not Supported", description: "Browser notifications not supported." });
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast({ title: "Notifications Enabled", description: "You will now receive desktop alerts." });
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
        toast({ title: "Token Copied", description: "FCM Token copied to clipboard." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Debug Error", description: "Could not retrieve token." });
    }
  };

  const NavItem = ({ id, label, icon: Icon }: { id: SettingsTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
        activeTab === id 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{label}</span>
      {activeTab === id && <ChevronRight className="h-3 w-3" />}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] p-0 gap-0 border-none bg-card overflow-hidden rounded-[2rem] shadow-2xl h-[600px] flex flex-row">
        <aside className="w-1/3 bg-black/20 border-r border-white/5 p-6 flex flex-col">
          <div className="mb-8 px-2">
            <DialogTitle className="text-xl font-bold tracking-tight">Settings</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Configure your kith workspace
            </DialogDescription>
          </div>

          <nav className="flex-1 space-y-1">
            <NavItem id="profile" label="Public Profile" icon={User} />
            <NavItem id="notifications" label="Notifications" icon={Bell} />
            <NavItem id="security" label="Privacy & Security" icon={Shield} />
          </nav>

          <div className="pt-6 border-t border-white/5 flex items-center gap-2.5 opacity-40 px-2">
            <Settings className="h-3 w-3" />
            <span className="text-[9px] uppercase font-bold tracking-widest">Version 2.2.0</span>
          </div>
        </aside>

        <main className="flex-1 flex flex-col h-full bg-card overflow-hidden">
          <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
            {activeTab === 'profile' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 border-2 border-white/5 shadow-xl overflow-hidden">
                      <AvatarImage src={avatarUrl} className="object-cover" />
                      <AvatarFallback className="text-2xl bg-secondary text-muted-foreground font-bold">
                        {username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isUploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange}
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">{username || 'User'}</h3>
                    <p className="text-xs text-muted-foreground">Click photo to upload new image (max 5MB).</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Display Name</Label>
                    <Input 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      placeholder="e.g. Alex Rivera" 
                      className="bg-black/20 border-white/5 h-12 rounded-xl focus-visible:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Personal Bio</Label>
                    <Textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)} 
                      placeholder="Share a little bit about yourself..." 
                      className="bg-black/20 border-white/5 rounded-xl min-h-[120px] resize-none focus-visible:ring-primary/40 text-sm leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-6 rounded-2xl bg-black/10 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-sm">Desktop Notifications</h4>
                      <p className="text-xs text-muted-foreground">Get alerted on new messages even when minimized.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-full border-white/10 hover:bg-white/5"
                      onClick={handleRequestNotifications}
                    >
                      Configure
                    </Button>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                  <Smartphone className="h-5 w-5 text-primary shrink-0 mt-1" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm">Persistent Connection</h4>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Kith ensures real-time delivery as long as the application remains open in a background tab.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <h4 className="font-bold text-sm">Secure Identity</h4>
                  </div>
                  <p className="text-xs text-muted-foreground bg-black/10 p-4 rounded-xl leading-relaxed border border-white/5">
                    Your account is secured via Firebase Authentication. Device tokens are used purely for internal notification routing.
                  </p>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between h-14 rounded-xl border border-dashed border-white/10 px-4 hover:bg-white/5 group"
                    onClick={copyDebugToken}
                  >
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Internal Auth Token</span>
                    {copiedToken ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 bg-black/10 border-t border-white/5 flex justify-end">
            <Button 
              onClick={handleSaveProfile} 
              disabled={isSaving} 
              className="rounded-xl px-8 h-12 font-bold shadow-xl shadow-primary/20 transition-all active:scale-95"
            >
              {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : 'Apply Changes'}
            </Button>
          </div>
        </main>
      </DialogContent>
    </Dialog>
  );
}
