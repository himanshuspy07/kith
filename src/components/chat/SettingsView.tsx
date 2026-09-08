"use client";

import React, { useState, useEffect } from 'react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, serverTimestamp, query, collection, where, arrayRemove } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Bell, 
  Shield, 
  Palette, 
  LogOut, 
  ChevronRight, 
  Moon, 
  Smartphone,
  Lock,
  Key,
  Trash2,
  UserX,
  Check,
  X,
  Loader2
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
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirmingPin, setIsConfirmingPin] = useState(false);

  // Blocked users management
  const blockedIds = useMemo(() => userData?.blockedUserIds || [], [userData?.blockedUserIds]);
  const blockedQuery = useMemoFirebase(() => {
    if (!db || blockedIds.length === 0) return null;
    return query(collection(db, 'users'), where('id', 'in', blockedIds.slice(0, 30)));
  }, [db, JSON.stringify(blockedIds)]);
  const { data: blockedUsers, isLoading: isBlockedLoading } = useCollection(blockedQuery);

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
      updateDocumentNonBlocking(userRef, { appLockEnabled: false });
      setIsPinVisible(false);
      toast({ title: "App Lock Disabled" });
    } else {
      setIsPinVisible(true);
      if (!userData?.appLockPin || userData.appLockPin.length < 4) {
        toast({ title: "Please set a 4-digit PIN to enable lock" });
      } else {
         updateDocumentNonBlocking(userRef, { appLockEnabled: true });
         toast({ title: "App Lock Enabled" });
      }
    }
  };

  const handleSavePin = () => {
    if (pin.length !== 4) {
      toast({ variant: "destructive", title: "Invalid PIN", description: "PIN must be 4 digits." });
      return;
    }

    if (pin !== confirmPin) {
      toast({ variant: "destructive", title: "PIN Mismatch", description: "The PINs you entered do not match." });
      return;
    }

    if (userRef) {
      updateDocumentNonBlocking(userRef, { 
        appLockPin: pin,
        appLockEnabled: true
      });
      setIsConfirmingPin(false);
      setConfirmPin('');
      toast({ title: "Security Updated", description: "Your PIN is now active." });
    }
  };

  const handleUnblock = (targetId: string) => {
    if (userRef) {
      updateDocumentNonBlocking(userRef, {
        blockedUserIds: arrayRemove(targetId)
      });
      toast({ title: "User Unblocked" });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background animate-in-fade overflow-y-auto scrollbar-hide">
      <header className="p-6 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-xl z-10">
        <h2 className="text-2xl font-black tracking-tighter uppercase italic">Settings</h2>
        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-50">Privacy & Personalization</p>
      </header>

      <div className="flex-1 p-6 space-y-10 pb-32">
        <section className="space-y-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Display</h4>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'dark', 'system'] as const).map(m => (
              <button 
                key={m}
                onClick={() => handleThemeChange(m)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                  theme === m ? "border-primary bg-primary/5 scale-95 shadow-lg" : "border-border/50 bg-card hover:border-primary/30"
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
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Secure with 4-digit PIN</p>
                </div>
              </div>
              <Switch checked={userData?.appLockEnabled || false} onCheckedChange={handleToggleLock} />
            </div>

            {isPinVisible && (
              <div className="p-6 bg-primary/5 rounded-[2.5rem] border border-primary/20 space-y-6 animate-in slide-in-from-top-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="h-4 w-4 text-primary" />
                    <Label className="text-[10px] font-black uppercase tracking-widest">{isConfirmingPin ? "Confirm Your PIN" : "Enter New PIN"}</Label>
                  </div>
                  
                  {!isConfirmingPin ? (
                    <div className="space-y-4">
                      <Input 
                        type="password" maxLength={4} value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="h-14 bg-background border-none text-center text-2xl tracking-[1.5em] rounded-xl font-black"
                      />
                      <Button 
                        onClick={() => pin.length === 4 && setIsConfirmingPin(true)} 
                        disabled={pin.length !== 4}
                        className="w-full h-12 rounded-xl bg-primary text-white font-bold uppercase tracking-widest"
                      >
                        Next Step
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in slide-in-from-right-4">
                      <Input 
                        type="password" maxLength={4} value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="h-14 bg-background border-none text-center text-2xl tracking-[1.5em] rounded-xl font-black ring-2 ring-primary/20"
                      />
                      <div className="flex gap-2">
                         <Button variant="ghost" onClick={() => { setIsConfirmingPin(false); setConfirmPin(''); }} className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest">Back</Button>
                         <Button onClick={handleSavePin} className="flex-[2] h-12 rounded-xl bg-primary text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20">Confirm PIN</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 bg-card rounded-2xl border border-border/50">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-destructive">
                     <UserX className="h-5 w-5" />
                   </div>
                   <span className="text-sm font-black uppercase tracking-widest">Blocked Users</span>
                 </div>
                 <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full">{blockedIds.length}</span>
               </div>
               
               <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                 {isBlockedLoading ? (
                   <Loader2 className="h-4 w-4 animate-spin mx-auto opacity-20" />
                 ) : blockedUsers && blockedUsers.length > 0 ? (
                   blockedUsers.map(u => (
                     <div key={u.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                       <div className="flex items-center gap-2">
                         <Avatar className="h-7 w-7"><AvatarImage src={u.profilePictureUrl} /><AvatarFallback>{u.username?.[0]}</AvatarFallback></Avatar>
                         <span className="text-xs font-bold">{u.username}</span>
                       </div>
                       <Button variant="ghost" size="sm" onClick={() => handleUnblock(u.id)} className="h-7 text-[9px] font-black uppercase text-primary tracking-widest hover:bg-primary/10">Unblock</Button>
                     </div>
                   ))
                 ) : (
                   <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-widest py-4 opacity-50">No users blocked</p>
                 )}
               </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Notifications</h4>
          <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-secondary">
                <Bell className="h-5 w-5" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest">Push Alerts</span>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
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
