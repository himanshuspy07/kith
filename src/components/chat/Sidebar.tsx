
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, LogOut, Settings, User, Upload, Loader2, Moon, Sun, Pin, PinOff, MoreVertical, Trash2, Copy, Check, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useDoc, useUser, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteField, serverTimestamp } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
  const [isUploading, setIsUploading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [copiedToken, setCopiedToken] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [newUsername, setNewUsername] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [newBio, setNewBio] = useState('');

  useEffect(() => {
    setCurrentTime(Date.now());
    const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

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
      toast({ variant: "destructive", title: "Not Supported" });
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast({ title: "Notifications Enabled" });
      window.location.reload(); // Reload to trigger FCM registration
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
        toast({ title: "Token Copied" });
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
            <DialogContent className="bg-card border-white/10 rounded-2xl">
              <DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-primary">Notifications</Label>
                  <Button variant="outline" className="w-full justify-start gap-2 h-12 rounded-xl" onClick={handleRequestNotifications}>
                    <Bell className="h-4 w-4" /> Enable Push Notifications
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2 h-12 rounded-xl text-xs" onClick={copyDebugToken}>
                    {copiedToken ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                    {copiedToken ? 'Copied!' : 'Copy Debug Token (For Testing)'}
                  </Button>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <Button variant="destructive" className="w-full h-12 rounded-xl" onClick={() => signOut(auth)}>Log Out</Button>
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
        {conversationListData.filter(r => r.displayName.toLowerCase().includes(searchQuery.toLowerCase())).map((room) => (
          <div
            key={room.id}
            onClick={() => onSelectConversation(room.id)}
            className={cn("p-4 mb-1 flex items-center gap-3 rounded-2xl cursor-pointer transition-all", selectedConversationId === room.id ? "bg-white/10" : "hover:bg-white/5")}
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={room.displayAvatar} />
              <AvatarFallback>{room.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <h3 className="text-sm font-bold truncate">{room.displayName}</h3>
              <p className="text-xs text-muted-foreground truncate">{room.lastMessageText || 'No messages yet'}</p>
            </div>
            {room.isPinned && <Pin className="h-3 w-3 text-primary fill-primary" />}
          </div>
        ))}
      </div>
    </div>
  );
}
