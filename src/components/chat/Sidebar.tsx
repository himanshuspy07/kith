
"use client";

import React, { useState, useMemo, memo, useEffect } from 'react';
import { LogOut, Search, Plus, Pin, MessageSquare, Loader2, Bell, Star, Inbox } from 'lucide-react';
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

const TypingAnimation = () => (
  <div className="flex items-center gap-0.5 ml-1">
    <div className="h-0.5 w-0.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="h-0.5 w-0.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
    <div className="h-0.5 w-0.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
  </div>
);

const ConversationItem = memo(({ room, isSelected, onClick, currentUserId }: any) => {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const timeAgo = useMemo(() => {
    if (!hasMounted || !room.updatedAt || !room.updatedAt.toDate) return null;
    try {
      return formatDistanceToNow(room.updatedAt.toDate(), { addSuffix: false });
    } catch (e) {
      return null;
    }
  }, [hasMounted, room.updatedAt]);

  const isTyping = room.typing && Object.keys(room.typing).length > 0 && Object.keys(room.typing).some(id => id !== currentUserId);

  return (
    <div
      onClick={() => onClick(room.id)}
      className={cn(
        "p-3 flex items-center gap-3 rounded-2xl cursor-pointer transition-all group relative animate-in-fade px-2",
        isSelected ? "bg-primary/10" : "hover:bg-white/5",
        room.isUnread && !isSelected && "bg-white/[0.03]"
      )}
    >
      {isSelected && <div className="absolute left-0 w-1 h-8 bg-primary rounded-full -translate-x-1" />}
      <div className="relative shrink-0">
        <Avatar className={cn("h-12 w-12 border transition-all duration-500", isSelected ? "border-primary/50 scale-105" : "border-white/10 group-hover:scale-105")}>
          <AvatarImage src={room.displayAvatar || undefined} className="object-cover" />
          <AvatarFallback className="bg-muted text-muted-foreground font-medium">{room.displayName?.[0]}</AvatarFallback>
        </Avatar>
        {room.isOnline && <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-accent border-[3px] border-background shadow-sm" />}
        {room.isPinned && <Pin className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-background rounded-full p-0.5 text-primary fill-primary shadow-sm" />}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center mb-0.5">
          <h3 className={cn(
            "text-xs truncate transition-colors", 
            isSelected ? "text-primary font-bold" : room.isUnread ? "text-foreground font-black" : "text-foreground font-bold"
          )}>
            {room.displayName}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {timeAgo && (
              <span className={cn(
                "text-[8px] font-bold uppercase",
                room.isUnread ? "text-primary" : "text-muted-foreground/40"
              )}>
                {timeAgo}
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className={cn(
            "text-[11px] truncate leading-snug flex items-center",
            room.isUnread ? "text-foreground font-bold" : "text-muted-foreground/60"
          )}>
            {isTyping ? (
              <div className="flex items-center text-accent italic font-bold">
                Typing <TypingAnimation />
              </div>
            ) : (room.lastMessageText || 'Start a conversation')}
          </div>
          {room.isUnread && (
            <Badge className="ml-2 h-4 min-w-[1rem] px-1 bg-primary text-[8px] font-black rounded-full flex items-center justify-center animate-in-fade">
              NEW
            </Badge>
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
    <div className={cn("h-full border-r border-white/5 flex flex-col bg-background shrink-0 z-30", className)}>
      <div className="p-4 md:p-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsSettingsOpen(true)}>
          <Avatar className="h-9 w-9 md:h-10 md:w-10 border-2 border-primary/20 transition-transform group-hover:scale-105">
            <AvatarImage src={currentUserProfile?.profilePictureUrl || undefined} className="object-cover" />
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
                  Are you sure you want to exit kith?
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

      <div className="px-4 md:px-6 py-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search Himanshu..." 
            className="bg-white/5 border-none h-10 rounded-xl pl-10 text-xs transition-all focus:bg-white/10" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>

        <Tabs value={activeFilter} onValueChange={(val: any) => setActiveFilter(val)} className="w-full">
          <TabsList className="bg-white/5 border-none h-9 p-1 rounded-xl w-full grid grid-cols-3">
            <TabsTrigger value="all" className="rounded-lg text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All
            </TabsTrigger>
            <TabsTrigger value="pinned" className="rounded-lg text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pinned
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-lg text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Unread
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto px-2 md:px-4 space-y-1 scrollbar-hide pb-6">
        {isLoading ? (
          <div className="p-2 space-y-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-2xl" />)}
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
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40 animate-in-fade">
            {activeFilter === 'pinned' ? (
              <Star className="h-10 w-10 mb-4" />
            ) : activeFilter === 'unread' ? (
              <Inbox className="h-10 w-10 mb-4" />
            ) : (
              <MessageSquare className="h-10 w-10 mb-4" />
            )}
            <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">
              {searchQuery ? "No matches found" : `No ${activeFilter !== 'all' ? activeFilter : 'active'} chats`}
            </p>
          </div>
        )}
      </div>
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}
