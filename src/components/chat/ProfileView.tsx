"use client";

import React, { useState, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { QrCode, Share2, Copy, Camera, Check, Edit2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ProfileView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const userRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: userData, isLoading } = useDoc(userRef);

  const [editData, setEditData] = useState({
    username: '',
    bio: ''
  });

  const handleStartEdit = () => {
    setEditData({
      username: userData?.username || '',
      bio: userData?.bio || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!userRef || !user) return;
    setIsSaving(true);
    
    updateDocumentNonBlocking(userRef, {
      username: editData.username.trim(),
      usernameLowercase: editData.username.trim().toLowerCase(),
      bio: editData.bio.trim(),
      updatedAt: serverTimestamp()
    });

    setTimeout(() => {
      setIsSaving(false);
      setIsEditing(false);
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
    }, 800);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && userRef) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateDocumentNonBlocking(userRef, {
          profilePictureUrl: reader.result as string,
          updatedAt: serverTimestamp()
        });
        toast({ title: "Avatar Changed" });
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background animate-in-fade overflow-y-auto scrollbar-hide">
      <header className="p-6 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-10 border-b border-border/50">
        <h2 className="text-2xl font-black tracking-tighter uppercase italic">My Profile</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full bg-muted/50"
          onClick={isEditing ? handleSave : handleStartEdit}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : isEditing ? <Check className="h-5 w-5 text-accent" /> : <Edit2 className="h-5 w-5" />}
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 gap-8 pb-32">
        <div className="relative group">
          <Avatar className="h-40 w-40 border-4 border-background shadow-2xl ring-4 ring-primary/20">
            <AvatarImage src={userData?.profilePictureUrl} className="object-cover" />
            <AvatarFallback className="text-5xl font-black bg-muted text-primary">{userData?.username?.[0]}</AvatarFallback>
          </Avatar>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"
          >
            <Camera className="h-8 w-8 text-white" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleAvatarChange} 
          />
        </div>

        <div className="w-full max-w-sm space-y-6">
          {isEditing ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Username</label>
                <Input 
                  value={editData.username} 
                  onChange={(e) => setEditData({...editData, username: e.target.value})}
                  className="h-14 rounded-2xl bg-muted/50 border-none font-bold text-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Bio</label>
                <Textarea 
                  value={editData.bio} 
                  onChange={(e) => setEditData({...editData, bio: e.target.value})}
                  className="rounded-2xl bg-muted/50 border-none font-medium resize-none min-h-[100px]"
                  placeholder="Tell your friends something about you..."
                />
              </div>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <h3 className="text-4xl font-black uppercase italic tracking-tighter">{userData?.username}</h3>
              <p className="text-muted-foreground font-medium px-4 leading-relaxed">
                {userData?.bio || "No bio yet. Tap edit to add one!"}
              </p>
            </div>
          )}
        </div>

        <div className="w-full max-w-xs bg-card rounded-[2.5rem] p-8 shadow-2xl border border-border/50 flex flex-col items-center gap-6">
          <div className="p-4 bg-white rounded-3xl shadow-inner">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${user?.uid}`} 
              alt="QR Code" 
              className="h-40 w-40 grayscale contrast-125"
            />
          </div>
          <div className="flex flex-col w-full gap-3">
             <Button 
              className="w-full h-14 rounded-2xl bg-foreground text-background font-black uppercase tracking-widest gap-3 shadow-xl"
              onClick={() => {
                navigator.clipboard.writeText(user?.uid || '');
                toast({ title: "User ID Copied", description: "Share this with your friends." });
              }}
             >
               <Copy className="h-5 w-5" /> Copy ID
             </Button>
             <Button variant="outline" className="w-full h-14 rounded-2xl border-2 font-black uppercase tracking-widest gap-3">
               <Share2 className="h-5 w-5" /> Share
             </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
