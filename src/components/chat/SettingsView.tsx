"use client";

import React, { useState, useEffect } from 'react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Shield, 
  Palette, 
  LogOut, 
  ChevronRight, 
  Moon, 
  Smartphone,
  Info,
  Lock,
  Key,
  Volume2,
  Eye,
  Trash2
} from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SettingsView() {
  const auth = useAuth();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: userData } = useDoc(userRef);

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [notifications, setNotifications] = useState(true);
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (userData) {
      setIsPinVisible(userData.appLockEnabled || false);
      setPin(userData.appLockPin || '');
    }
    const savedTheme = localStorage.getItem('kith-theme') as any;
    if (savedTheme) setTheme(savedTheme);
  }, [userData]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('kith-theme', newTheme);
    const html = document.documentElement;
    const isDark = newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) html.classList.add('dark');
    else html.classList.remove('dark');
    toast({ title: `Theme set to ${newTheme}` });
  };

  const handleToggleLock = (enabled: boolean) => {
    if (!userRef) return;
    
    if (!enabled) {
      // Turning off is immediate
      updateDocumentNonBlocking(userRef, { appLockEnabled: false });
      setIsPinVisible(false);
      toast({ title: "App Lock Disabled" });
    } else {
      // Turning on just shows the input field; we don't enable in DB until PIN is 4 digits
      setIsPinVisible(true);
      if (!userData?.appLockPin || userData.appLockPin.length < 4) {
        toast({ title: "Please set a 4-digit PIN to enable lock" });
      } else {
         updateDocumentNonBlocking(userRef, { appLockEnabled: true });
         toast({ title: "App Lock Enabled" });
      }
    }
  };

  const handleUpdatePin = (newPin: string) => {
    const cleanPin = newPin.replace(/\D/g, '').slice(0, 4);
    setPin(cleanPin);
    if (cleanPin.length === 4 && userRef) {
      updateDocumentNonBlocking(userRef, { 
        appLockPin: cleanPin,
        appLockEnabled: true // Auto-enable once a valid PIN is set
      });
      toast({ title: "PIN Updated & Lock Enabled" });
    }
  };

  const SettingsItem = ({ icon: Icon, label, color = "text-muted-foreground", action }: any) => (
    <div 
      onClick={action}
      className="flex items-center justify-between p-4 bg-card rounded-2xl hover:bg-muted/50 transition-colors cursor-pointer border border-border/50 group"
    >
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-black uppercase tracking-widest">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background animate-in-fade overflow-y-auto scrollbar-hide">
      <header className="p-6 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-xl z-10">
        <h2 className="text-2xl font-black tracking-tighter uppercase italic">App Settings</h2>
        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-50">Stable Build v2.5.0</p>
      </header>

      <div className="flex-1 p-6 space-y-10 pb-32">
        <section className="space-y-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Appearance</h4>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'dark', 'system'] as const).map(m => (
              <button 
                key={m}
                onClick={() => handleThemeChange(m)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                  theme === m ? "border-primary bg-primary/5 scale-95" : "border-border/50 bg-card hover:border-primary/50"
                )}
              >
                {m === 'light' ? <Palette className="h-5 w-5" /> : m === 'dark' ? <Moon className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Privacy & Security</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest">App Lock</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Require 4-digit PIN</p>
                </div>
              </div>
              <Switch checked={userData?.appLockEnabled || false} onCheckedChange={handleToggleLock} />
            </div>

            {isPinVisible && (
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-4 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  <Label className="text-[10px] font-black uppercase tracking-widest">Set 4-Digit PIN</Label>
                </div>
                <Input 
                  type="password" 
                  maxLength={4} 
                  value={pin}
                  onChange={(e) => handleUpdatePin(e.target.value)}
                  placeholder="••••"
                  className="h-14 bg-background border-none text-center text-2xl tracking-[1.5em] rounded-xl font-black"
                />
                <p className="text-[9px] text-center text-primary/60 font-bold uppercase">Lock activates after setting a 4-digit PIN</p>
              </div>
            )}
            
            <SettingsItem icon={Eye} label="Vanish Mode Defaults" color="text-accent" />
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Notifications</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-secondary">
                  <Bell className="h-5 w-5" />
                </div>
                <span className="text-sm font-black uppercase tracking-widest">Push Alerts</span>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <SettingsItem icon={Volume2} label="Notification Sounds" color="text-purple-500" />
          </div>
        </section>

        <div className="pt-6 space-y-3">
           <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full h-16 rounded-2xl bg-destructive/5 text-destructive font-black uppercase tracking-[0.2em] border border-destructive/10 hover:bg-destructive hover:text-white transition-all">
                  <LogOut className="mr-3 h-6 w-6" /> End Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2rem] border-none bg-card shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Sign Out?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground font-medium">
                    You will need to log back in to access your messages and friends.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                  <AlertDialogAction className="rounded-xl bg-destructive font-black uppercase tracking-widest" onClick={() => signOut(auth)}>Log Out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="pt-8 text-center space-y-1">
              <p className="text-[9px] text-muted-foreground/30 uppercase font-black tracking-[0.4em]">
                KITH &copy; 2026 • Built for Privacy • Made by Himanshu
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}
