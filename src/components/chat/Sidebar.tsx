"use client";

import React, { useState, useMemo } from 'react';
import { Settings, LogOut, Search, Plus, Pin, User, Bell } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

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
      return { 
        ...room, 
        displayName, 
        displayAvatar, 
        isPinned: room.pinnedBy?.[user?.uid || ''] === true 
      };
    }).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b.updatedAt?.toDate?.()?.getTime() || 0) - (a.updatedAt?.toDate?.()?.getTime() || 0);
    });
  }, [rooms, participantProfiles, user]);

  return (
    <div className={cn("h-full border-r border-white/5 flex flex-col bg-background/80 backdrop-blur-xl shrink-0 z-30", className)}>
      <div className="p-6 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => setIsSettingsOpen(true)}
        >
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-primary/20 transition-transform group-hover:scale-105">
              <AvatarImage src={currentUserProfile?.profilePictureUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {currentUserProfile?.username?.[0] || 'k'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-accent border-4 border-background" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-none">{currentUserProfile?.username || 'kith user'}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Profile & Settings</span>
          </div>
        </div>
        <div className="flex gap-2">
          <NewChatDialog onChatCreated={onSelectConversation} />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 text-muted-foreground rounded-full hover:bg-white/5"
            onClick={() => signOut(auth)}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="px-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input 
            placeholder="Search conversations..." 
            className="bg-white/5 border-none h-12 rounded-xl pl-10 focus-visible:ring-primary/20" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 w-full bg-white/5 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : conversationListData.filter(r => r.displayName.toLowerCase().includes(searchQuery.toLowerCase())).map((room) => (
          <div
            key={room.id}
            onClick={() => onSelectConversation(room.id)}
            className={cn(
              "p-4 flex items-center gap-4 rounded-2xl cursor-pointer transition-all active:scale-[0.98]",
              selectedConversationId === room.id 
                ? "bg-primary/10 border border-primary/10" 
                : "hover:bg-white/5 border border-transparent"
            )}
          >
            <div className="relative">
              <Avatar className="h-14 w-14 shrink-0 border border-white/5">
                <AvatarImage src={room.displayAvatar} />
                <AvatarFallback className="bg-secondary text-muted-foreground">
                  {room.displayName?.[0]}
                </AvatarFallback>
              </Avatar>
              {room.onlineStatus && (
                <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-accent border-2 border-background" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center mb-1">
                <h3 className={cn("text-sm font-bold truncate", selectedConversationId === room.id ? "text-primary" : "text-foreground")}>
                  {room.displayName}
                </h3>
                {room.updatedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(room.updatedAt.toDate(), { addSuffix: false })}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate leading-relaxed">
                {room.lastMessageText || 'No messages yet'}
              </p>
            </div>
            {room.isPinned && <Pin className="h-3 w-3 text-primary fill-primary shrink-0 opacity-50" />}
          </div>
        ))}
      </div>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}