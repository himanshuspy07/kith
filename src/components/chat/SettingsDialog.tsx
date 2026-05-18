
"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  ChevronRight,
  Menu,
  Sun,
  Moon,
  Monitor,
  Palette,
  AlertTriangle,
  Trash2,
  Lock,
  Key,
  QrCode,
  Share2
} from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
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
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [appLockPin, setAppLockPin] = useState('');

  useEffect(() => {
    if (!user || !db || !open) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setUsername(data.username || '');
        setBio(data.bio || '');
        setAvatarUrl(data.profilePictureUrl || undefined);
        setAppLockEnabled(data.appLockEnabled || false);
        setAppLockPin(data.appLockPin || '');
      }
    };
    fetchProfile();
  }, [user?.uid, db, open]);

  const handleSaveProfile = async () => {
    if (!user || !db) return;
    setIsSaving(true);
    updateDocumentNonBlocking(doc(db, 'users', user.uid), {
      username: username.trim(),
      usernameLowercase: username.trim().toLowerCase(),
      bio: bio.trim(),
      profilePictureUrl: avatarUrl || '',
      appLockEnabled,
      appLockPin,
      updatedAt: serverTimestamp(),
    });
    setTimeout(() => { setIsSaving(false); toast({ title: "Profile Updated" }); }, 800);
  };

  const NavItem = ({ id, label, icon: Icon }: { id: SettingsTab, label: string, icon: any }) => (
    <button
      onClick={() => { setActiveTab(id); if (isMobile) setShowMobileNav(false); }}
      className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all", activeTab === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground")}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{label}</span>
      {activeTab === id && <ChevronRight className="h-3 w-3" />}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 gap-0 border-none bg-card overflow-hidden shadow-2xl flex flex-col md:flex-row", isMobile ? "w-[95vw] h-[90vh] rounded-3xl" : "sm:max-w-[800px] h-[650px] rounded-[2rem]")}>
        <aside className={cn("bg-black/[0.02] dark:bg-black/20 border-r border-black/5 dark:border-white/5 p-6 flex flex-col", isMobile ? "w-full shrink-0 h-auto" : "w-1/3 h-full")}>
          <div className="mb-6 md:mb-8 px-2 flex items-center justify-between">
            <DialogTitle className="text-xl font-bold tracking-tight">Settings</DialogTitle>
            {isMobile && <Button variant="ghost" size="icon" onClick={() => setShowMobileNav(!showMobileNav)}><Menu className="h-5 w-5" /></Button>}
          </div>
          <nav className={cn("flex-1 space-y-1", isMobile && !showMobileNav ? "hidden" : "block")}>
            <NavItem id="profile" label="Profile & QR" icon={User} />
            <NavItem id="appearance" label="Appearance" icon={Palette} />
            <NavItem id="notifications" label="Notifications" icon={Bell} />
            <NavItem id="security" label="Privacy & Security" icon={Shield} />
          </nav>
        </aside>

        <main className="flex-1 flex flex-col h-full bg-card overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide space-y-8">
            {activeTab === 'profile' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 border-2 border-white/5 shadow-xl">
                      <AvatarImage src={avatarUrl} className="object-cover" />
                      <AvatarFallback className="text-2xl font-bold">{username?.[0]}</AvatarFallback>
                    </Avatar>
                    <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-6 w-6 text-white" />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (!file) return;
                       const reader = new FileReader();
                       reader.onloadend = () => setAvatarUrl(reader.result as string);
                       reader.readAsDataURL(file);
                    }} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">{username || 'Kith User'}</h3>
                    <p className="text-xs text-muted-foreground">User ID: <span className="font-mono text-[10px] bg-black/10 px-1 rounded select-all">{user?.uid}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

                  <div className="flex flex-col items-center gap-4 bg-primary/5 p-6 rounded-3xl border border-primary/10">
                    <Label className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2"><QrCode className="h-3 w-3" /> Your Personal QR</Label>
                    <div className="p-3 bg-white rounded-2xl shadow-2xl border-4 border-white/5">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${user?.uid}`} 
                        alt="QR Code" 
                        className="h-32 w-32"
                      />
                    </div>
                    <p className="text-[9px] text-center text-muted-foreground leading-relaxed">Scan this code to instantly add Himanshu to kith.</p>
                    <Button variant="ghost" size="sm" className="h-8 text-[9px] uppercase tracking-widest font-bold" onClick={() => {
                      navigator.clipboard.writeText(user?.uid || '');
                      toast({ title: "ID Copied" });
                    }}>
                      <Share2 className="mr-2 h-3 w-3" /> Share Profile Link
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'dark', 'system'] as ThemeMode[]).map(m => (
                    <Button key={m} variant="outline" className={cn("h-24 flex flex-col gap-2 rounded-2xl border-2 capitalize", theme === m ? "border-primary bg-primary/5" : "border-white/5")}>
                      {m === 'light' ? <Sun className="h-6 w-6" /> : m === 'dark' ? <Moon className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
                      <span className="text-[10px] font-bold">{m}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center"><Lock className="h-5 w-5 text-primary" /></div>
                      <div>
                        <p className="text-sm font-bold">App Lock</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Require 4-digit PIN</p>
                      </div>
                    </div>
                    <Switch checked={appLockEnabled} onCheckedChange={setAppLockEnabled} />
                  </div>
                  {appLockEnabled && (
                    <div className="space-y-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                      <Label className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2"><Key className="h-3 w-3" /> Set 4-Digit PIN</Label>
                      <Input 
                        type="password" maxLength={4} placeholder="••••" 
                        value={appLockPin} onChange={(e) => setAppLockPin(e.target.value.replace(/\D/g, '').slice(0,4))}
                        className="bg-background border-none h-12 rounded-xl text-center text-xl tracking-[1em]"
                      />
                    </div>
                  )}
                </div>
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
