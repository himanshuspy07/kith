
"use client";

import React, { useState } from 'react';
import { Search, MoreVertical, Plus, Users, MessageSquare } from 'lucide-react';
import { MOCK_CONVERSATIONS, CURRENT_USER, User } from '@/lib/mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface SidebarProps {
  onSelectConversation: (id: string) => void;
  selectedConversationId?: string;
}

export default function Sidebar({ onSelectConversation, selectedConversationId }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = MOCK_CONVERSATIONS.filter(conv => {
    const name = conv.type === 'group' ? conv.name : conv.participants.find(p => p.id !== CURRENT_USER.id)?.name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-80 h-full border-r border-border flex flex-col bg-background/50 backdrop-blur-sm">
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-primary/20">
            <AvatarImage src={CURRENT_USER.avatar} />
            <AvatarFallback>{CURRENT_USER.name[0]}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm">Kith</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreVertical className="h-4 w-4" />
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
        {filteredConversations.map((conv) => {
          const isGroup = conv.type === 'group';
          const partner = conv.participants.find(p => p.id !== CURRENT_USER.id);
          const name = isGroup ? conv.name : partner?.name;
          const avatar = isGroup ? undefined : partner?.avatar;
          const isSelected = selectedConversationId === conv.id;

          return (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={cn(
                "w-full p-3 flex items-start gap-3 transition-colors hover:bg-muted/20 text-left relative",
                isSelected && "bg-muted/40"
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="h-12 w-12 border border-border/50">
                  {avatar && <AvatarImage src={avatar} />}
                  <AvatarFallback>{isGroup ? <Users className="h-6 w-6" /> : name?.[0]}</AvatarFallback>
                </Avatar>
                {!isGroup && partner?.status === 'online' && (
                  <span className="absolute bottom-0.5 right-0.5 h-3 w-3 bg-accent border-2 border-background rounded-full" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="text-sm font-medium truncate pr-2">{name}</h3>
                  {conv.lastMessage && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.lastMessage.timestamp), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground truncate italic">
                    {conv.lastMessage?.senderId === CURRENT_USER.id ? 'You: ' : ''}
                    {conv.lastMessage?.text || 'No messages yet'}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="h-4 min-w-[16px] px-1 flex items-center justify-center bg-primary text-[10px] font-bold rounded-full">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>

              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
