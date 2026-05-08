
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
import { Switch } from '@/components/ui/switch';
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
  Palette,
  AlertTriangle,
  Trash2,
  AtSign,
  MessageSquare
} from 'lucide-react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { getMessaging, getToken } from 'firebase/messaging';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { deleteUser } from 'firebase/auth';
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
  const auth = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  
  // Notification Prefs
  const [prefs, setPrefs] = useState({
    allMessages: true,
    mentionsOnly: false,
    muteAll: false
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem('kith-theme') as ThemeMode || 'dark';
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
        setAvatarUrl(data.profilePictureUrl || undefined);
        if (data.notificationPreferences) {
          setPrefs(data.notificationPreferences);
        }
      }
    };

    fetchProfile();
  }, [user?.uid, db, open]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 600 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 600KB.",
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user || !db) return;
    setIsSaving(true);

    const userRef = doc(db, 'users', user.uid);
    updateDocumentNonBlocking(userRef, {
      username: username.trim(),
      usernameLowercase: username.trim().toLowerCase(),
      bio: bio.trim(),
      profilePictureUrl: avatarUrl || '',
      notificationPreferences: prefs,
      updatedAt: serverTimestamp(),
    });

    setTimeout(() => {
      setIsSaving(false);
      toast({ title: "Settings Saved" });
    }, 800);
  };

  const handleRequestNotifications = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast({ title: "Notifications Enabled" });
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
        toast({ title: "Token Copied" });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error retrieving token" });
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
            <DialogTitle className="text-xl font-bold tracking-tight">Settings</DialogTitle>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setShowMobileNav(!showMobileNav)}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
          <nav className={cn("flex-1 space-y-1", isMobile && !showMobileNav ? "hidden" : "block")}>
            <NavItem id="profile" label="Public Profile" icon={User} />
            <NavItem id="appearance" label="Appearance" icon={Palette} />
            <NavItem id="notifications" label="Notifications" icon={Bell} />
            <NavItem id="security" label="Privacy & Security" icon={Shield} />
          </nav>
        </aside>

        <main className="flex-1 flex flex-col h-full bg-card overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                  <div className="relative group">
                    <Avatar className="h-20 w-20 border-2 border-white/5 shadow-xl">
                      <AvatarImage src={avatarUrl} className="object-cover" />
                      <AvatarFallback className="text-2xl font-bold">{username?.[0]}</AvatarFallback>
                    </Avatar>
                    <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-6 w-6 text-white" />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold">{username || 'Kith User'}</h3>
                    <p className="text-xs text-muted-foreground">Change your display identity.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold">Username</Label>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-white/5 border-none h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold">Bio</Label>
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-white/5 border-none rounded-xl min-h-[100px] resize-none" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary">Granular Controls</Label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Message Alerts</p>
                          <p className="text-[10px] text-muted-foreground">Notify for every new message</p>
                        </div>
                      </div>
                      <Switch checked={prefs.allMessages} onCheckedChange={(v) => setPrefs(p => ({...p, allMessages: v}))} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-accent/20 flex items-center justify-center">
                          <AtSign className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Mentions Only</p>
                          <p className="text-[10px] text-muted-foreground">Only notify when @username is typed</p>
                        </div>
                      </div>
                      <Switch checked={prefs.mentionsOnly} onCheckedChange={(v) => setPrefs(p => ({...p, mentionsOnly: v}))} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-2xl border border-destructive/10">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-destructive/20 flex items-center justify-center">
                          <Bell className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Do Not Disturb</p>
                          <p className="text-[10px] text-muted-foreground text-destructive/70">Mute all notifications globally</p>
                        </div>
                      </div>
                      <Switch checked={prefs.muteAll} onCheckedChange={(v) => setPrefs(p => ({...p, muteAll: v}))} />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <Button variant="outline" className="w-full h-12 rounded-xl border-dashed" onClick={handleRequestNotifications}>
                    <Smartphone className="mr-2 h-4 w-4" /> Check Device Permissions
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'dark', 'system'] as ThemeMode[]).map(m => (
                    <Button 
                      key={m}
                      variant="outline" 
                      onClick={() => handleThemeChange(m)}
                      className={cn("h-24 flex flex-col gap-2 rounded-2xl border-2 capitalize", theme === m ? "border-primary bg-primary/5" : "border-white/5")}
                    >
                      {m === 'light' ? <Sun className="h-6 w-6" /> : m === 'dark' ? <Moon className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
                      <span className="text-[10px] font-bold">{m}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <Button variant="ghost" className="w-full justify-between h-14 rounded-xl bg-white/5 border-white/10 px-4 group" onClick={copyDebugToken}>
                  <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Notification ID</span>
                  {copiedToken ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4 opacity-40 group-hover:opacity-100" />}
                </Button>
              </div>
            )}
          </div>

          <div className="p-8 bg-black/20 border-t border-white/5 flex justify-end">
            <Button onClick={handleSaveProfile} disabled={isSaving} className="rounded-xl px-10 h-12 font-bold shadow-xl shadow-primary/20 transition-all active:scale-95">
              {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : 'Save Changes'}
            </Button>
          </div>
        </main>
      </DialogContent>
    </Dialog>
  );
}
