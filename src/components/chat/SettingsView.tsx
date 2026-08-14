"use client";

import React from 'react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Shield, 
  Palette, 
  LogOut, 
  ChevronRight, 
  Moon, 
  Smartphone,
  Info
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

export default function SettingsView() {
  const auth = useAuth();
  const { user } = useUser();

  const SettingsItem = ({ icon: Icon, label, color = "text-muted-foreground" }: any) => (
    <div className="flex items-center justify-between p-4 bg-card rounded-2xl hover:bg-muted/50 transition-colors cursor-pointer border border-border/50">
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-xl bg-muted flex items-center justify-center", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-bold uppercase tracking-widest">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background animate-in-fade">
      <header className="p-6 border-b">
        <h2 className="text-2xl font-black tracking-tighter uppercase italic">KITH Settings</h2>
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Version 2.0.1</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">App Preferences</h4>
          <SettingsItem icon={Bell} label="Notifications" color="text-primary" />
          <SettingsItem icon={Palette} label="Themes & Wallpapers" color="text-secondary" />
          <SettingsItem icon={Moon} label="Dark Mode" />
        </div>

        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Privacy & Data</h4>
          <SettingsItem icon={Shield} label="Privacy Controls" color="text-accent" />
          <SettingsItem icon={Smartphone} label="Devices" />
          <SettingsItem icon={Info} label="Help Center" />
        </div>

        <div className="pt-8">
           <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full h-14 rounded-2xl bg-destructive/10 text-destructive font-black uppercase tracking-[0.2em] hover:bg-destructive hover:text-white transition-all">
                  <LogOut className="mr-3 h-5 w-5" /> Sign Out
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-none">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-bold">End Session?</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to log out of KITH?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction className="rounded-xl bg-destructive" onClick={() => signOut(auth)}>Sign Out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <div className="p-6 text-center opacity-20">
        <p className="text-[10px] font-black uppercase tracking-widest">KITH Messenger &copy; 2026</p>
      </div>
    </div>
  );
}

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');
