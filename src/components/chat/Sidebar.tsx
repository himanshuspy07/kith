
"use client";

import React, { useState, useMemo } from 'react';
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

interface SidebarProps {
  onSelectConversation: (id: string) => void;
  selectedConversationId?: string;
  className?: string;
}

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
      
      if (!room.isGroupChat && participantProfiles && user) {
        const otherUserId = room.memberIds?.find((id: string) => id !== user.uid);
        const otherUserProfile = participantProfiles.find(u => u.id === otherUserId);
        if (otherUserProfile) {
          displayName = otherUserProfile.username;
          displayAvatar = otherUserProfile.profilePictureUrl;
        }
      }
      return { 
        ...room, 
        displayName, 
        displayAvatar, 
        isPinned: room.pinnedBy?.[user?.uid || ''] === true 
      };
    }).sort((a, b) => {
      // Sort by pin status first
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      // Then by updatedAt
      return (b.updatedAt?.toDate?.()?.getTime() || 0) - (a.updatedAt?.toDate?.()?.getTime() || 0);
    });
  }, [rooms, participantProfiles, user]);

  return (
    <div className={cn("h-full border-r border-white/5 flex flex-col bg-background/95 backdrop-blur-xl shrink-0 z-30", className)}>
      {/* User Info Bar */}
      <div className="p-6 flex items-center justify-between border-b border-white/5">
        <div 
          className="flex items-center gap-3 cursor-pointer group hover:bg-white/5 p-2 -m-2 rounded-2xl transition-all" 
          onClick={() => setIsSettingsOpen(true)}
        >
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-primary/20 transition-all group-hover:border-primary ring-offset-2 ring-offset-background group-hover:ring-2 ring-primary/20">
              <AvatarImage src={currentUserProfile?.profilePictureUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {currentUserProfile?.username?.[0]?.toUpperCase() || 'K'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-accent border-2 border-background" />
          </div>
          <div className="flex flex-col overflow-hidden max-w-[100px]">
            <span className="font-bold text-xs truncate leading-none">{currentUserProfile?.username || 'Kith User'}</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">Profile</span>
          </div>
        </div>
        <div className="flex gap-1">
          <NewChatDialog onChatCreated={onSelectConversation} />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground rounded-full hover:bg-white/5"
            onClick={() => signOut(auth)}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search kith..." 
            className="bg-white/5 border-none h-10 rounded-xl pl-10 text-xs focus-visible:ring-primary/20 transition-all placeholder:text-muted-foreground/30" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-hide">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : conversationListData.filter(r => r.displayName.toLowerCase().includes(searchQuery.toLowerCase())).map((room) => (
          <div
            key={room.id}
            onClick={() => onSelectConversation(room.id)}
            className={cn(
              "p-3 flex items-center gap-3 rounded-2xl cursor-pointer transition-all group relative animate-in-fade",
              selectedConversationId === room.id 
                ? "bg-primary/10" 
                : "hover:bg-white/5"
            )}
          >
            {selectedConversationId === room.id && (
              <div className="absolute left-0 w-1 h-8 bg-primary rounded-full -translate-x-1" />
            )}
            
            <div className="relative shrink-0">
              <Avatar className="h-12 w-12 border border-white/10">
                <AvatarImage src={room.displayAvatar} />
                <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                  {room.displayName?.[0]}
                </AvatarFallback>
              </Avatar>
              {room.isPinned && <Pin className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-background rounded-full p-0.5 text-primary fill-primary" />}
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center mb-0.5">
                <h3 className={cn("text-xs font-bold truncate transition-colors", selectedConversationId === room.id ? "text-primary" : "text-foreground")}>
                  {room.displayName}
                </h3>
                {room.updatedAt && (
                  <span className="text-[8px] text-muted-foreground/40 font-bold uppercase tracking-tighter">
                    {formatDistanceToNow(room.updatedAt.toDate(), { addSuffix: false })}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/60 truncate leading-snug">
                {room.lastMessageText || 'Start a conversation'}
              </p>
            </div>
            
            <ChevronRight className={cn(
              "h-3 w-3 text-muted-foreground opacity-0 transition-all transform",
              "group-hover:opacity-40 group-hover:translate-x-1",
              selectedConversationId === room.id && "opacity-100 text-primary"
            )} />
          </div>
        ))}
      </div>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}
