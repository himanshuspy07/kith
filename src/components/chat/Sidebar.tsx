
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Settings, User, Bell, Smartphone, Copy, Check, LogOut, Search, Plus, Pin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useDoc, useUser, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import NewChatDialog from './NewChatDialog';
import { useToast } from '@/hooks/use-toast';
import { getMessaging, getToken } from 'firebase/messaging';

interface SidebarProps {
  onSelectConversation: (id: string) => void;
  selectedConversationId?: string;
  className?: string;
}

export default function Sidebar({ onSelectConversation, selectedConversationId, className }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const currentUserRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: currentUserProfile } = useDoc(currentUserRef);

  const roomsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'chatRooms'), where(`members.${user.uid}`, '==', true));
  }, [db, user?.uid]);
  const { data: rooms, isLoading } = useCollection(roomsQuery);

  const participantIds = useMemo(() => {
    if (!rooms || !user) return [];
    const ids = new Set<string>();
    rooms.forEach(room => {
      room.memberIds?.forEach((id: string) => { if (id !== user.uid) ids.add(id); });
    });
    return Array.from(ids).slice(0, 30);
  }, [rooms, user]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || participantIds.length === 0) return null;
    return query(collection(db, 'users'), where('id', 'in', participantIds));
  }, [db, participantIds]);
  const { data: participantProfiles } = useCollection(usersQuery);

  const conversationListData = useMemo(() => {
    if (!rooms) return [];
    return rooms.map(room => {
      let displayName = room.name || 'Chat';
      let displayAvatar = null;
      if (!room.isGroupChat && participantProfiles && user) {
        const otherUserId = room.memberIds?.find((id: string) => id !== user.uid);
        const otherUserProfile = participantProfiles.find(u => u.id === otherUserId);
        if (otherUserProfile) {
          displayName = otherUserProfile.username;
          displayAvatar = otherUserProfile.profilePictureUrl;
        }
      }
      return { ...room, displayName, displayAvatar, isPinned: room.pinnedBy?.[user?.uid || ''] === true };
    }).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b.updatedAt?.toDate?.()?.getTime() || 0) - (a.updatedAt?.toDate?.()?.getTime() || 0);
    });
  }, [rooms, participantProfiles, user]);

  const handleRequestNotifications = async () => {
    if (!("Notification" in window)) {
      toast({ variant: "destructive", title: "Not Supported", description: "Your browser doesn't support notifications." });
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast({ title: "Notifications Enabled", description: "You will now receive alerts for new messages." });
    }
  };

  const sendTestNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification("kith Test", {
        body: "This is a test notification. It works!",
        icon: "/icon.svg"
      });
      toast({ title: "Test Sent", description: "Check your notification center." });
    } else {
      toast({ variant: "destructive", title: "Permission Required", description: "Please enable notifications first." });
    }
  };

  const copyDebugToken = async () => {
    try {
      const messaging = getMessaging();
      const token = await getToken(messaging, { vapidKey: "BCg1UIFx2xNkxfPrxSeATRRO2jyjVh2c2C_9AEfN3FsbTFjcS3EN5fyF3qIDsWbSt5RN_L4UpGWlq4QTuBJwplE" });
      if (token) {
        await navigator.clipboard.writeText(token);
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
        toast({ title: "Token Copied", description: "Ready for manual testing in Firebase Console." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to get token" });
    }
  };

  return (
    <div className={cn("h-full border-r border-white/5 flex flex-col bg-background/80 backdrop-blur-xl shrink-0 z-30", className)}>
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-primary/20">
            <AvatarImage src={currentUserProfile?.profilePictureUrl || undefined} />
            <AvatarFallback>{currentUserProfile?.username?.[0] || 'k'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{currentUserProfile?.username || 'kith'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Settings className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 rounded-2xl sm:max-w-md">
              <DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-primary">Notifications</Label>
                  <Button variant="outline" className="w-full justify-start gap-3 h-12 rounded-xl" onClick={handleRequestNotifications}>
                    <Bell className="h-4 w-4" /> Enable Notifications
                  </Button>
                  <Button variant="secondary" className="w-full justify-start gap-3 h-12 rounded-xl" onClick={sendTestNotification}>
                    <Smartphone className="h-4 w-4" /> Send Test Alert
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl text-xs" onClick={copyDebugToken}>
                    {copiedToken ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                    {copiedToken ? 'Token Copied!' : 'Copy Device Token'}
                  </Button>
                </div>
                <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                  <Button variant="destructive" className="w-full h-12 rounded-xl" onClick={() => signOut(auth)}>Log Out</Button>
                  <p className="text-[10px] text-center text-muted-foreground">kith v1.0.0-pwa</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <NewChatDialog onChatCreated={onSelectConversation} />
        </div>
      </div>

      <div className="px-5 mb-4">
        <Input placeholder="Search chats..." className="bg-white/5 border-none h-11 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-2xl" />)}
          </div>
        ) : conversationListData.filter(r => r.displayName.toLowerCase().includes(searchQuery.toLowerCase())).map((room) => (
          <div
            key={room.id}
            onClick={() => onSelectConversation(room.id)}
            className={cn("p-4 mb-1 flex items-center gap-3 rounded-2xl cursor-pointer transition-all", selectedConversationId === room.id ? "bg-white/10" : "hover:bg-white/5")}
          >
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={room.displayAvatar} />
              <AvatarFallback>{room.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center mb-0.5">
                <h3 className="text-sm font-bold truncate">{room.displayName}</h3>
                {room.updatedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(room.updatedAt.toDate(), { addSuffix: false })}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{room.lastMessageText || 'No messages yet'}</p>
            </div>
            {room.isPinned && <Pin className="h-3 w-3 text-primary fill-primary shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
