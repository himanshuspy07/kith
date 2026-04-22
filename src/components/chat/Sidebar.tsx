
"use client";

import React, { useState } from 'react';
import { Search, MoreVertical, Plus, Users, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useUser, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

interface SidebarProps {
  onSelectConversation: (id: string) => void;
  selectedConversationId?: string;
}

export default function Sidebar({ onSelectConversation, selectedConversationId }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();

  // Query chat rooms where the user is a member
  const roomsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'chatRooms'),
      where(`members.${user.uid}`, '==', true),
      orderBy('updatedAt', 'desc')
    );
  }, [db, user]);

  const { data: rooms, isLoading } = useCollection(roomsQuery);

  const filteredConversations = rooms?.filter(room => {
    return room.name?.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  return (
    <div className="w-80 h-full border-r border-border flex flex-col bg-background/50 backdrop-blur-sm">
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-primary/20">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback>{user?.displayName?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Kith</span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{user?.email}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => signOut(auth)}>
            <LogOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search conversations..." 
            className="pl-9 h-9 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 items-center animate-pulse">
                <div className="h-12 w-12 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
          </div>
        ) : (
          filteredConversations.map((room) => {
            const isSelected = selectedConversationId === room.id;
            const updatedAt = room.updatedAt?.toDate?.() || new Date();

            return (
              <button
                key={room.id}
                onClick={() => onSelectConversation(room.id)}
                className={cn(
                  "w-full p-3 flex items-start gap-3 transition-colors hover:bg-muted/20 text-left relative",
                  isSelected && "bg-muted/40"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 border border-border/50">
                    <AvatarFallback><Users className="h-6 w-6" /></AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-sm font-medium truncate pr-2">{room.name || 'Group Chat'}</h3>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(updatedAt, { addSuffix: false })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground truncate italic">
                      {room.lastMessageText || 'No messages yet'}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
