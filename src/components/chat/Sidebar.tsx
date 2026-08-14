"use client";

import React, { useState, useMemo, memo, useEffect } from 'react';
import { LogOut, Search, Plus, Pin, MessageSquare, Loader2, Bell, Star, Inbox, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { useCollection, useDoc, useUser, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
  const db = useFirestore();
  
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const timeDisplay = useMemo(() => {
    if (!hasMounted || !room.updatedAt || !room.updatedAt.toDate) return null;
    try {
      const date = room.updatedAt.toDate();
      const now = new Date();
      if (differenceInMinutes(now, date) < 1440) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return null;
    }
  }, [hasMounted, room.updatedAt]);

  const isTyping = room.typing && Object.keys(room.typing).length > 0 && Object.keys(room.typing).some(id => id !== currentUserId);

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db || !currentUserId) return;
    const roomRef = doc(db, 'chatRooms', room.id);
    updateDocumentNonBlocking(roomRef, {
      [`pinnedBy.${currentUserId}`]: !room.isPinned
    });
  };

  return (
    <div
      onClick={() => onClick(room.id)}
      className={cn(
        "p-3 flex items-center gap-3 cursor-pointer transition-all relative animate-in-fade",
        isSelected ? "sidebar-item-active" : "hover:bg-muted/50 dark:hover:bg-white/[0.02]"
      )}
    >
      <div className="relative shrink-0">
        <Avatar className={cn("h-12 w-12 transition-all duration-300", isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "")}>
          <AvatarImage src={room.displayAvatar || undefined} className="object-cover" />
          <AvatarFallback className="bg-muted text-muted-foreground font-semibold">{room.displayName?.[0]}</AvatarFallback>
        </Avatar>
        {room.isOnline && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />}
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex justify-between items-center">
          <h3 className={cn(
            "text-[14px] truncate leading-none", 
            room.isUnread ? "font-bold text-foreground" : "font-medium text-foreground/90"
          )}>
            {room.displayName}
          </h3>
          <div className="flex items-center gap-2">
            {timeDisplay && (
              <span className={cn(
                "text-[11px] font-medium whitespace-nowrap",
                room.isUnread ? "text-primary" : "text-muted-foreground/60"
              )}>
                {timeDisplay}
              </span>
            )}
            {room.isPinned && <Pin className="h-3 w-3 text-muted-foreground fill-current rotate-45" />}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <p className={cn(
            "text-[13px] truncate leading-tight flex-1",
            room.isUnread ? "text-foreground font-semibold" : "text-muted-foreground"
          )}>
            {isTyping ? (
              <span className="text-primary italic animate-pulse">is typing...</span>
            ) : (room.lastMessageText || 'No messages yet')}
          </p>
          {room.isUnread && (
            <div className="ml-2 h-4.5 min-w-[1.125rem] px-1 bg-primary text-[10px] text-white font-bold rounded-full flex items-center justify-center">
              !
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
ConversationItem.displayName = 'ConversationItem';

export default function Sidebar({ onSelectConversation, selectedConversationId, className }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned' | 'unread'>('all');
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
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
    if (!rooms || !hasMounted || !user) return [];
    return rooms.map(room => {
      let displayName = room.name || 'Conversation';
      let displayAvatar = room.isGroupChat ? room.groupImageUrl : null;
      let isOnline = false;
      let otherUserProfile = null;

      if (!room.isGroupChat && participantProfiles) {
        const otherUserId = room.memberIds?.find((id: string) => id !== user.uid);
        otherUserProfile = participantProfiles.find(u => u.id === otherUserId);
        if (otherUserProfile) {
          displayName = otherUserProfile.username;
          displayAvatar = otherUserProfile.profilePictureUrl;
          
          const lastActive = otherUserProfile.lastActiveAt?.toDate?.() || new Date(0);
          const isRecentlyActive = differenceInMinutes(new Date(), lastActive) < 3;
          isOnline = otherUserProfile.onlineStatus === true && isRecentlyActive;
        }
      }

      const isUnread = room.lastMessageText && 
                       room.lastMessageSenderId !== user.uid && 
                       (!room.readBy || !room.readBy.includes(user.uid));

      return { 
        ...room, 
        displayName, 
        displayAvatar, 
        isOnline,
        isUnread,
        otherUserProfile,
        isPinned: room.pinnedBy?.[user?.uid || ''] === true 
      };
    }).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const timeA = a.updatedAt?.toDate?.()?.getTime() || 0;
      const timeB = b.updatedAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
  }, [rooms, participantProfiles, user, hasMounted]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let list = conversationListData;

    if (activeFilter === 'pinned') {
      list = list.filter(r => r.isPinned);
    } else if (activeFilter === 'unread') {
      list = list.filter(r => r.isUnread);
    }

    if (!q) return list;

    return list.filter(r => {
      const matchName = r.displayName.toLowerCase().includes(q);
      const matchBio = r.otherUserProfile?.bio?.toLowerCase().includes(q);
      const matchLastMsg = r.lastMessageText?.toLowerCase().includes(q);
      return matchName || matchBio || matchLastMsg;
    });
  }, [conversationListData, searchQuery, activeFilter]);

  return (
    <div className={cn("h-full border-r border-border flex flex-col bg-background shrink-0 z-30", className)}>
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsSettingsOpen(true)}>
          <Avatar className="h-10 w-10 border border-border shadow-sm transition-transform active:scale-95">
            <AvatarImage src={currentUserProfile?.profilePictureUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-primary/5 text-primary font-bold">{currentUserProfile?.username?.[0]?.toUpperCase() || 'K'}</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>
          <NewChatDialog onChatCreated={onSelectConversation} />
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[1.25rem] border-none bg-card shadow-2xl p-6 max-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold tracking-tight">Sign Out?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Are you sure you want to end your session on kith?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-2">
                <AlertDialogCancel className="rounded-lg h-11">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  className="rounded-lg bg-destructive text-white hover:bg-destructive/90 h-11 font-semibold"
                  onClick={() => signOut(auth)}
                >
                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <div className="px-4 py-2 space-y-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search Himanshu..." 
            className="bg-muted/50 border-none h-10 rounded-lg pl-10 text-[14px] transition-all focus:bg-muted" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>

        <Tabs value={activeFilter} onValueChange={(val: any) => setActiveFilter(val)} className="w-full">
          <TabsList className="bg-muted/50 border-none h-9 p-1 rounded-lg w-full">
            <TabsTrigger value="all" className="flex-1 rounded-md text-[12px] font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              All
            </TabsTrigger>
            <TabsTrigger value="pinned" className="flex-1 rounded-md text-[12px] font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Pinned
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex-1 rounded-md text-[12px] font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Unread
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto mt-2 scrollbar-hide">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex gap-3 items-center">
                <div className="h-12 w-12 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((room) => (
            <ConversationItem 
              key={room.id}
              room={room}
              isSelected={selectedConversationId === room.id}
              onClick={onSelectConversation}
              currentUserId={user?.uid}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
            <MessageSquare className="h-10 w-10 mb-4 text-muted-foreground" />
            <p className="text-sm font-semibold tracking-tight">
              {searchQuery ? "No matches found" : `No chats in ${activeFilter}`}
            </p>
          </div>
        )}
      </div>
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}