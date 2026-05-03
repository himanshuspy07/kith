
"use client";

import React, { useState, useMemo, memo, useEffect } from 'react';
import { Settings, LogOut, Search, Plus, Pin, User, Bell, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useDoc, useUser, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import NewChatDialog from './NewChatDialog';
import SettingsDialog from './SettingsDialog';
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

interface SidebarProps {
  onSelectConversation: (id: string) => void;
  selectedConversationId?: string;
  className?: string;
}

const ConversationItem = memo(({ room, isSelected, onClick, currentUserId }: any) => {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <div
      onClick={() => onClick(room.id)}
      className={cn(
        "p-3 flex items-center gap-3 rounded-2xl cursor-pointer transition-all group relative",
        isSelected ? "bg-primary/10" : "hover:bg-white/5"
      )}
    >
      {isSelected && <div className="absolute left-0 w-1 h-8 bg-primary rounded-full -translate-x-1" />}
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12 border border-white/10">
          <AvatarImage src={room.displayAvatar} />
          <AvatarFallback className="bg-muted text-muted-foreground font-medium">{room.displayName?.[0]}</AvatarFallback>
        </Avatar>
        {room.isOnline && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-accent border-2 border-background" />}
        {room.isPinned && <Pin className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-background rounded-full p-0.5 text-primary fill-primary" />}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center mb-0.5">
          <h3 className={cn("text-xs font-bold truncate", isSelected ? "text-primary" : "text-foreground")}>{room.displayName}</h3>
          {hasMounted && room.updatedAt && (
            <span className="text-[8px] text-muted-foreground/40 font-bold uppercase">
              {formatDistanceToNow(room.updatedAt.toDate())}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground/60 truncate leading-snug">
          {room.typing && Object.keys(room.typing).length > 0 && Object.keys(room.typing).some(id => id !== currentUserId)
            ? 'Typing...'
            : (room.lastMessageText || 'Start a conversation')}
        </p>
      </div>
      <ChevronRight className={cn("h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-40", isSelected && "opacity-100 text-primary")} />
    </div>
  );
});
ConversationItem.displayName = 'ConversationItem';

export default function Sidebar({ onSelectConversation, selectedConversationId, className }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();

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
      let displayName = room.name || 'Conversation';
      let displayAvatar = room.isGroupChat ? room.groupImageUrl : null;
      let isOnline = false;
      if (!room.isGroupChat && participantProfiles && user) {
        const otherUserId = room.memberIds?.find((id: string) => id !== user.uid);
        const otherUserProfile = participantProfiles.find(u => u.id === otherUserId);
        if (otherUserProfile) {
          displayName = otherUserProfile.username;
          displayAvatar = otherUserProfile.profilePictureUrl;
          isOnline = otherUserProfile.onlineStatus === true;
        }
      }
      return { 
        ...room, 
        displayName, 
        displayAvatar, 
        isOnline,
        isPinned: room.pinnedBy?.[user?.uid || ''] === true 
      };
    }).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const timeA = a.updatedAt?.toDate?.()?.getTime() || 0;
      const timeB = b.updatedAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
  }, [rooms, participantProfiles, user]);

  return (
    <div className={cn("h-full border-r border-white/5 flex flex-col bg-background/95 backdrop-blur-xl shrink-0 z-30", className)}>
      <div className="p-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsSettingsOpen(true)}>
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src={currentUserProfile?.profilePictureUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{currentUserProfile?.username?.[0]?.toUpperCase() || 'K'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col max-w-[100px]"><span className="font-bold text-xs truncate leading-none">{currentUserProfile?.username || 'Kith User'}</span></div>
        </div>
        <div className="flex gap-1">
          <NewChatDialog onChatCreated={onSelectConversation} />
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <LogOut className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2rem] border-none bg-card/95 backdrop-blur-xl p-8 max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold">Sign Out?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Are you sure you want to end your session? You'll need to log back in to access your kith conversations.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-3">
                <AlertDialogCancel className="rounded-xl border-white/10 h-12">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12 font-bold"
                  onClick={() => signOut(auth)}
                >
                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Search kith..." 
            className="bg-white/5 border-none h-10 rounded-xl pl-10 text-xs" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-hide">
        {isLoading ? (
          <div className="p-2 space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-2xl" />)}
          </div>
        ) : conversationListData.filter(r => r.displayName.toLowerCase().includes(searchQuery.toLowerCase())).map((room) => (
          <ConversationItem 
            key={room.id}
            room={room}
            isSelected={selectedConversationId === room.id}
            onClick={onSelectConversation}
            currentUserId={user?.uid}
          />
        ))}
      </div>
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}
