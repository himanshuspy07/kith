
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
  Menu,
  Sun,
  Moon,
  Monitor,
  Palette
} from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { getMessaging, getToken } from 'firebase/messaging';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VAPID_KEY = "BCg1UIFx2xNkxfPrxSeATRRO2jyjVh2c2C_9AEfN3FsbTFjcS3EN5fyF3qIDsWbSt5RN_L4UpGWlq4QTuBJwplE";

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'security';
type ThemeMode = 'light' | 'dark' | 'system';

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('system');

  useEffect(() => {
    const savedTheme = localStorage.getItem('kith-theme') as ThemeMode || 'system';
    setTheme(savedTheme);
  }, []);

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    localStorage.setItem('kith-theme', mode);
    const html = document.documentElement;
    if (mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    toast({ title: `Theme set to ${mode}` });
  };

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

    // Firestore documents have a 1MB limit. 600KB is a safe threshold for Base64 strings (which add ~33% overhead).
    if (file.size > 600 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 600KB for document stability.",
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
      onClick={() => {
        setActiveTab(id);
        if (isMobile) setShowMobileNav(false);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
        activeTab === id 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{label}</span>
      {activeTab === id && <ChevronRight className="h-3 w-3" />}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 gap-0 border-none bg-card overflow-hidden shadow-2xl flex flex-col md:flex-row",
        isMobile ? "w-[95vw] h-[80vh] rounded-3xl" : "sm:max-w-[750px] h-[600px] rounded-[2rem]"
      )}>
        <aside className={cn(
          "bg-black/[0.02] dark:bg-black/20 border-r border-black/5 dark:border-white/5 p-6 flex flex-col",
          isMobile ? "w-full shrink-0 h-auto" : "w-1/3 h-full"
        )}>
          <div className="mb-6 md:mb-8 px-2 flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">Settings</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Configure your kith workspace
              </DialogDescription>
            </div>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setShowMobileNav(!showMobileNav)}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>

          <nav className={cn(
            "flex-1 space-y-1 transition-all",
            isMobile && !showMobileNav ? "hidden" : "block"
          )}>
            <NavItem id="profile" label="Public Profile" icon={User} />
            <NavItem id="appearance" label="Appearance" icon={Palette} />
            <NavItem id="notifications" label="Notifications" icon={Bell} />
            <NavItem id="security" label="Privacy & Security" icon={Shield} />
          </nav>

          {!isMobile && (
            <div className="pt-6 border-t border-black/5 dark:border-white/5 flex items-center gap-2.5 opacity-40 px-2">
              <Settings className="h-3 w-3" />
              <span className="text-[9px] uppercase font-bold tracking-widest">Version 2.3.0</span>
            </div>
          )}
        </aside>

        <main className="flex-1 flex flex-col h-full bg-card overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
            {activeTab === 'profile' && (
              <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-black/5 dark:border-white/5 text-center md:text-left">
                  <div className="relative group">
                    <Avatar className="h-20 w-20 md:h-24 md:24 border-2 border-black/5 dark:border-white/5 shadow-xl overflow-hidden">
                      <AvatarImage src={avatarUrl} className="object-cover" />
                      <AvatarFallback className="text-2xl bg-secondary text-muted-foreground font-bold">
                        {username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="absolute inset-0 bg-black/50 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
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
                    <p className="text-xs text-muted-foreground">Click photo to update image.</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Display Name</Label>
                    <Input 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      placeholder="e.g. Alex Rivera" 
                      className="bg-black/5 dark:bg-black/20 border-black/5 dark:border-white/5 h-12 rounded-xl focus-visible:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Personal Bio</Label>
                    <Textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)} 
                      placeholder="Share a little bit about yourself..." 
                      className="bg-black/5 dark:bg-black/20 border-black/5 dark:border-white/5 rounded-xl min-h-[100px] md:min-h-[120px] resize-none focus-visible:ring-primary/40 text-sm leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary">Theme Selection</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => handleThemeChange('light')}
                      className={cn(
                        "h-24 flex flex-col gap-2 rounded-2xl border-2",
                        theme === 'light' ? "border-primary bg-primary/5" : "border-black/5"
                      )}
                    >
                      <Sun className={cn("h-6 w-6", theme === 'light' ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Light</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleThemeChange('dark')}
                      className={cn(
                        "h-24 flex flex-col gap-2 rounded-2xl border-2",
                        theme === 'dark' ? "border-primary bg-primary/5" : "border-black/5"
                      )}
                    >
                      <Moon className={cn("h-6 w-6", theme === 'dark' ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Dark</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleThemeChange('system')}
                      className={cn(
                        "h-24 flex flex-col gap-2 rounded-2xl border-2",
                        theme === 'system' ? "border-primary bg-primary/5" : "border-black/5"
                      )}
                    >
                      <Monitor className={cn("h-6 w-6", theme === 'system' ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">System</span>
                    </Button>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <h4 className="text-sm font-bold mb-1">Adaptive Interface</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose between a vibrant light workspace, a focused dark environment, or let kith mirror your system settings automatically.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-5 md:p-6 rounded-2xl bg-black/10 border border-black/5 dark:border-white/5 space-y-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-sm">Desktop Notifications</h4>
                      <p className="text-xs text-muted-foreground">Get alerted on new messages.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full md:w-auto rounded-full border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                      onClick={handleRequestNotifications}
                    >
                      Configure
                    </Button>
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
                  <p className="text-xs text-muted-foreground bg-black/5 dark:bg-black/10 p-4 rounded-xl leading-relaxed border border-black/5 dark:border-white/5">
                    Your account is secured via Firebase Authentication.
                  </p>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between h-14 rounded-xl border border-dashed border-black/10 dark:border-white/10 px-4 hover:bg-black/5 dark:hover:bg-white/5 group"
                    onClick={copyDebugToken}
                  >
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Auth Token</span>
                    {copiedToken ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8 bg-black/[0.02] dark:bg-black/10 border-t border-black/5 dark:border-white/5 flex justify-end">
            <Button 
              onClick={handleSaveProfile} 
              disabled={isSaving} 
              className="w-full md:w-auto rounded-xl px-8 h-12 font-bold shadow-xl shadow-primary/20 transition-all active:scale-95"
            >
              {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : 'Apply Changes'}
            </Button>
          </div>
        </main>
      </DialogContent>
    </Dialog>
  );
}
