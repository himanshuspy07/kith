
"use client";

import React, { useState, useMemo, memo, useEffect } from 'react';
import { Search, Plus, MessageSquare, Loader2, UserPlus, Camera, Pin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { useCollection, useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import NewChatDialog from './NewChatDialog';

interface SidebarProps {
  onSelectConversation: (id: string) => void;
  selectedConversationId?: string;
  className?: string;
}

const ConversationItem = memo(({ room, isSelected, onClick, currentUserId }: any) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeDisplay = useMemo(() => {
    if (!room.updatedAt || !room.updatedAt.toDate) return null;
    try {
      const date = room.updatedAt.toDate();
      if (differenceInMinutes(now, date) < 1440) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return null;
    }
  }, [room.updatedAt, now]);

  const isTyping = useMemo(() => {
    if (!room.typing) return false;
    const nowMs = now.getTime();
    return Object.entries(room.typing).some(([id, timestamp]: any) => {
      if (id === currentUserId) return false;
      const ts = timestamp?.toMillis ? timestamp.toMillis() : 0;
      return (nowMs - ts) < 5000;
    });
  }, [room.typing, currentUserId, now]);

  return (
    <div
      onClick={() => onClick(room.id)}
      className={cn(
        "p-4 flex items-center gap-4 cursor-pointer transition-all active:bg-muted/50 border-b border-border/40 min-w-0",
        isSelected ? "bg-muted shadow-inner" : "hover:bg-muted/20"
      )}
    >
      <div className="relative shrink-0 p-0.5">
        <div className={cn(
          "rounded-full p-0.5 transition-all duration-300",
          room.isOnline ? "ring-[3px] ring-accent ring-offset-2 ring-offset-background" : "ring-1 ring-border"
        )}>
          <Avatar className="h-14 w-14">
            <AvatarImage src={room.displayAvatar || undefined} className="object-cover" />
            <AvatarFallback className="bg-muted text-muted-foreground text-lg font-bold">{room.displayName?.[0] || '?'}</AvatarFallback>
          </Avatar>
        </div>
        {room.isOnline && (
          <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-accent border-2 border-background rounded-full shadow-sm" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {room.isPinned && <Pin className="h-3 w-3 text-primary fill-current shrink-0" />}
            <h3 className="text-[17px] font-bold text-foreground truncate uppercase tracking-tighter">
              {room.displayName}
            </h3>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter shrink-0">
            {timeDisplay}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {isTyping ? (
            <div className="flex items-center gap-1 overflow-hidden">
               <span className="text-[13px] text-accent font-black animate-pulse whitespace-nowrap">Typing...</span>
            </div>
          ) : (
            <p className={cn(
              "text-[14px] truncate flex-1",
              room.isUnread ? "text-secondary font-black" : "text-muted-foreground font-medium"
            )}>
              {room.lastMessageText || 'New Friend'}
            </p>
          )}
          {room.isUnread && (
            <div className="flex items-center justify-center bg-secondary min-w-[1.2rem] h-5 px-1 rounded-full text-[10px] font-black text-secondary-foreground shadow-sm">
              NEW
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <Camera className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
});
ConversationItem.displayName = 'ConversationItem';

export default function Sidebar({ onSelectConversation, selectedConversationId, className }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [ticker, setTicker] = useState(0);
  const [mounted, setMounted] = useState(false);
  const { user } = useUser();
  const db = useFirestore();

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setTicker(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const currentUserRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: currentUserData } = useDoc(currentUserRef);

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
    return Array.from(ids);
  }, [JSON.stringify(rooms?.map(r => r.id))]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || participantIds.length === 0) return null;
    return query(collection(db, 'users'), where('id', 'in', participantIds.slice(0, 30)));
  }, [db, JSON.stringify(participantIds)]);
  const { data: participantProfiles } = useCollection(usersQuery);

  const conversationListData = useMemo(() => {
    if (!rooms || !user || !mounted) return [];
    const now = new Date();
    return rooms.map(room => {
      let displayName = room.name || 'Friend';
      let displayAvatar = room.isGroupChat ? room.groupImageUrl : null;
      let isOnline = false;

      if (!room.isGroupChat && participantProfiles) {
        const otherUserId = room.memberIds?.find((id: string) => id !== user.uid);
        const otherUserProfile = participantProfiles.find(u => u.id === otherUserId);
        if (otherUserProfile) {
          displayName = otherUserProfile.username;
          displayAvatar = otherUserProfile.profilePictureUrl;
          const lastActive = otherUserProfile.lastActiveAt?.toDate?.() || new Date(0);
          isOnline = otherUserProfile.onlineStatus === true && (now.getTime() - lastActive.getTime()) < 180000;
        }
      }

      const lastRead = room.lastRead?.[user.uid];
      const roomUpdateTime = room.updatedAt?.toMillis() || 0;
      const userReadTime = lastRead?.toMillis() || 0;
      
      const isUnread = room.lastMessageText && 
                       room.lastMessageSenderId !== user.uid && 
                       roomUpdateTime > userReadTime;

      const isPinned = room.pinned?.[user.uid] || false;

      return { ...room, displayName, displayAvatar, isOnline, isUnread, isPinned };
    }).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
      const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
      return timeB - timeA;
    });
  }, [rooms, participantProfiles, user?.uid, ticker, mounted]);

  const filteredConversations = conversationListData.filter(c => 
    c.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isMeOnline = useMemo(() => {
    if (!currentUserData?.lastActiveAt || !mounted) return true;
    const lastActive = currentUserData.lastActiveAt.toDate();
    return (Date.now() - lastActive.getTime()) < 180000;
  }, [currentUserData?.lastActiveAt, ticker, mounted]);

  if (!mounted) return <div className={cn("h-full flex flex-col bg-background max-w-full", className)} />;

  return (
    <div className={cn("h-full flex flex-col bg-background max-w-full", className)}>
      <header className="px-4 py-4 flex items-center justify-between border-b border-border/80 sticky top-0 z-10 bg-background/95 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            "relative p-0.5 ring-2 ring-offset-2 ring-offset-background rounded-full transition-all duration-500 shrink-0",
            isMeOnline ? "ring-accent" : "ring-transparent"
          )}>
            <Avatar className="h-10 w-10 bg-muted">
              <AvatarImage src={currentUserData?.profilePictureUrl || user?.photoURL || undefined} className="object-cover" />
              <AvatarFallback className="text-sm font-bold">{currentUserData?.username?.[0] || user?.displayName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            {isMeOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent border-2 border-background rounded-full" />}
          </div>
          <div className="relative group flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search Friends" 
              className="bg-muted/80 border-none h-10 rounded-full pl-10 w-full font-bold focus-visible:ring-2 ring-primary/30 text-xs" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="ml-2">
          <NewChatDialog onChatCreated={onSelectConversation} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
        ) : filteredConversations.length > 0 ? (
          <div className="flex flex-col">
            {filteredConversations.map((room) => (
              <ConversationItem 
                key={room.id}
                room={room}
                isSelected={selectedConversationId === room.id}
                onClick={onSelectConversation}
                currentUserId={user?.uid}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
            <div className="h-20 w-20 bg-muted/30 rounded-[2rem] flex items-center justify-center mb-6">
              <UserPlus className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold uppercase tracking-tighter italic">No Friends Yet</h3>
            <p className="text-muted-foreground mt-2 font-medium text-sm max-w-[200px]">Start a conversation to see your friends here.</p>
          </div>
        )}
      </div>
      
      <div className="p-4 text-center opacity-20 border-t border-border/20 shrink-0">
        <p className="text-[8px] font-black uppercase tracking-[0.4em]">Made by Himanshu</p>
      </div>
    </div>
  );
}
