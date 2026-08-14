"use client";

import React, { useState, useMemo, memo, useEffect } from 'react';
import { Search, Plus, MessageSquare, Loader2, UserPlus, Camera } from 'lucide-react';
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
  const timeDisplay = useMemo(() => {
    if (!room.updatedAt || !room.updatedAt.toDate) return null;
    try {
      const date = room.updatedAt.toDate();
      const now = new Date();
      if (differenceInMinutes(now, date) < 1440) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return null;
    }
  }, [room.updatedAt]);

  const isTyping = room.typing && Object.keys(room.typing).length > 0 && Object.keys(room.typing).some(id => id !== currentUserId);

  return (
    <div
      onClick={() => onClick(room.id)}
      className={cn(
        "p-4 flex items-center gap-4 cursor-pointer transition-all active:bg-muted/50",
        isSelected ? "bg-muted" : "hover:bg-muted/30"
      )}
    >
      <div className="relative shrink-0">
        <Avatar className={cn("h-14 w-14", room.isOnline ? "online-ring" : "border")}>
          <AvatarImage src={room.displayAvatar || undefined} className="object-cover" />
          <AvatarFallback className="bg-muted text-muted-foreground text-lg font-bold">{room.displayName?.[0]}</AvatarFallback>
        </Avatar>
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-[17px] font-bold text-foreground truncate">
          {room.displayName}
        </h3>
        <div className="flex items-center gap-2">
          <p className={cn(
            "text-[14px] truncate flex-1",
            room.isUnread ? "text-secondary font-black" : "text-muted-foreground font-medium"
          )}>
            {isTyping ? "Typing..." : (room.lastMessageText || 'New Friend')}
          </p>
          <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-tighter">
            {timeDisplay}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
          <Camera className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
});
ConversationItem.displayName = 'ConversationItem';

export default function Sidebar({ onSelectConversation, selectedConversationId, className }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useUser();
  const db = useFirestore();

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
    if (!rooms || !user) return [];
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
          isOnline = otherUserProfile.onlineStatus === true && differenceInMinutes(new Date(), lastActive) < 3;
        }
      }

      const isUnread = room.lastMessageText && 
                       room.lastMessageSenderId !== user.uid && 
                       (!room.readBy || !room.readBy.includes(user.uid));

      return { ...room, displayName, displayAvatar, isOnline, isUnread };
    }).sort((a, b) => {
      const timeA = a.updatedAt?.toDate?.()?.getTime() || 0;
      const timeB = b.updatedAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
  }, [rooms, participantProfiles, user]);

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      <header className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-muted">
            <AvatarFallback className="text-sm font-bold">{user?.displayName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search Friends" 
              className="bg-muted border-none h-10 rounded-full pl-10 w-48 md:w-64 font-bold" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <NewChatDialog onChatCreated={onSelectConversation} />
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
        ) : conversationListData.length > 0 ? (
          <div className="divide-y divide-border/50">
            {conversationListData.map((room) => (
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
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <UserPlus className="h-16 w-16 mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-xl font-bold">No Friends Yet</h3>
            <p className="text-muted-foreground mt-2">Start a conversation to see your friends here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
