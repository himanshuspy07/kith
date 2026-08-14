"use client";

import React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { QrCode, Share2, Copy, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProfileView() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: userData } = useDoc(userRef);

  return (
    <div className="h-full flex flex-col bg-[#FFFC00] animate-in-fade">
      <header className="p-6 flex justify-between items-center">
        <h2 className="text-2xl font-black tracking-tighter uppercase italic">KITH Profile</h2>
        <div className="h-10 w-10 rounded-full bg-black/5 flex items-center justify-center">
           <Star className="h-5 w-5 fill-current" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        <div className="relative">
          <Avatar className="h-32 w-32 border-4 border-white shadow-2xl">
            <AvatarImage src={userData?.profilePictureUrl} />
            <AvatarFallback className="text-4xl font-bold bg-white text-primary">{userData?.username?.[0]}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            Snap Score: 1.2k
          </div>
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-3xl font-black uppercase italic tracking-tighter">{userData?.username}</h3>
          <p className="text-sm font-bold opacity-60">ID: {user?.uid.slice(0,8)}...</p>
        </div>

        <div className="w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center gap-6">
          <div className="p-4 bg-[#FFFC00] rounded-3xl">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${user?.uid}`} 
              alt="QR Code" 
              className="h-40 w-40"
            />
          </div>
          <div className="flex flex-col w-full gap-3">
             <Button 
              className="w-full h-12 rounded-2xl bg-black text-white font-bold gap-2"
              onClick={() => {
                navigator.clipboard.writeText(user?.uid || '');
                toast({ title: "ID Copied!" });
              }}
             >
               <Copy className="h-4 w-4" /> Copy User ID
             </Button>
             <Button variant="outline" className="w-full h-12 rounded-2xl border-2 font-bold gap-2">
               <Share2 className="h-4 w-4" /> Share Profile
             </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
