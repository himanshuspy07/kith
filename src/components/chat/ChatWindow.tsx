"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Info, MessageSquare, ChevronLeft, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCollection, useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, where, limitToLast } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface ChatWindowProps {
  conversationId?: string;
  onBack?: () => void;
}

const WALLPAPERS = [
  { id: 'default', name: 'Standard', value: 'transparent' },
  { id: 'slate', name: 'Dark Slate', value: 'hsl(var(--background))' },
  { id: 'ocean', name: 'Deep Sea', value: 'linear-gradient(135deg, #0f172a, #1e293b)' },
  { id: 'emerald', name: 'Forest', value: 'linear-gradient(135deg, #064e3b, #065f46)' },
];

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [messageLimit] = useState(50);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const db = useFirestore();

  const roomRef = useMemoFirebase(() => {
    if (!db || !conversationId) return null;
    return doc(db, 'chatRooms', conversationId);
  }, [db, conversationId]);
  const { data: room } = useDoc(roomRef);

  const participantsQuery = useMemoFirebase(() => {
    if (!db || !room?.memberIds || room.memberIds.length === 0) return null;
    return query(collection(db, 'users'), where('id', 'in', room.memberIds));
  }, [db, room?.memberIds]);
  const { data: participants } = useCollection(participantsQuery);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !conversationId) return null;
    return query(
      collection(db, 'chatRooms', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limitToLast(messageLimit)
    );
  }, [db, conversationId, messageLimit]);
  const { data: messages } = useCollection(messagesQuery);

  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages?.length]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || !conversationId || !user || !room) return;
    
    const messageData = {
      chatRoomId: conversationId,
      senderId: user.uid,
      content: content,
      type: 'text',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
    };

    addDocumentNonBlocking(collection(db, 'chatRooms', conversationId, 'messages'), messageData);
    updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId), {
      lastMessageText: content,
      lastMessageSenderId: user.uid,
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
    });
    
    setInputValue('');
  };

  const chatDisplayName = React.useMemo(() => {
    if (!room) return '...';
    if (!room.isGroupChat && participants && user) {
      const otherUser = participants.find(p => p.id !== user.uid);
      if (otherUser) return otherUser.username;
    }
    return room.name || 'Chat';
  }, [room, participants, user]);

  const chatAvatar = React.useMemo(() => {
    if (!room) return null;
    if (!room.isGroupChat && participants && user) {
      const otherUser = participants.find(p => p.id !== user.uid);
      return otherUser?.profilePictureUrl;
    }
    return null;
  }, [room, participants, user]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-background relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="relative z-10 space-y-6 flex flex-col items-center">
          <div className="h-24 w-24 rounded-[2rem] bg-white/5 flex items-center justify-center shadow-2xl">
            <MessageSquare className="h-10 w-10 text-primary opacity-40" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tighter">Your Workspace</h2>
            <p className="text-muted-foreground text-sm max-w-[280px]">Select a conversation from the sidebar to start chatting with your kith.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <div className="h-24 px-8 flex items-center justify-between border-b border-white/5 bg-background/40 backdrop-blur-3xl sticky top-0 z-30">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={onBack}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          <Avatar className="h-12 w-12 border border-white/10">
            <AvatarImage src={chatAvatar || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">{chatDisplayName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold leading-none">{chatDisplayName}</h3>
            <span className="text-[10px] text-accent uppercase tracking-widest mt-1 font-bold">Secure Connection</span>
          </div>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5">
              <Info className="h-5 w-5 text-muted-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card border-white/10 p-0 sm:max-w-md">
            <div className="bg-primary/5 p-12 flex flex-col items-center text-center gap-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-2xl">
                <AvatarImage src={chatAvatar || undefined} />
                <AvatarFallback className="text-3xl bg-primary/20 text-primary">{chatDisplayName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">{chatDisplayName}</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Conversation Details</p>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-bold text-primary tracking-widest">Chat Customization</Label>
                <div className="grid grid-cols-4 gap-3">
                  {WALLPAPERS.map(wp => (
                    <button 
                      key={wp.id} 
                      title={wp.name}
                      className={cn(
                        "h-12 w-full rounded-xl border-2 transition-all hover:scale-105",
                        room?.wallpaper === wp.value ? "border-primary" : "border-transparent"
                      )} 
                      style={{ background: wp.value }} 
                      onClick={() => roomRef && updateDocumentNonBlocking(roomRef, { wallpaper: wp.value })} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide" style={{ background: room?.wallpaper || 'transparent' }}>
        {messages?.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
              <div className={cn(
                "max-w-[75%] p-4 rounded-[1.5rem] text-sm shadow-xl transition-all hover:scale-[1.01]", 
                isMe 
                  ? "bg-primary text-primary-foreground rounded-br-none" 
                  : "bg-card border border-white/5 rounded-bl-none"
              )}>
                <p className="leading-relaxed">{msg.content}</p>
              </div>
              <div className="text-[9px] opacity-40 mt-1.5 px-2 flex items-center gap-2">
                {msg.createdAt && format(msg.createdAt.toDate(), 'HH:mm')}
                {isMe && <div className="h-1 w-1 rounded-full bg-accent" />}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-8 border-t border-white/5 bg-background/60 backdrop-blur-3xl">
        <div className="flex items-center gap-4 max-w-5xl mx-auto">
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl bg-white/5 shrink-0">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div className="flex-1 relative">
            <Input 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
              placeholder="Type your message..." 
              className="bg-white/5 border-none h-14 rounded-2xl px-6 focus-visible:ring-primary/20" 
            />
          </div>
          <Button 
            onClick={handleSend} 
            disabled={!inputValue.trim()} 
            className="h-14 px-8 rounded-2xl shadow-2xl shadow-primary/20 transition-all active:scale-95"
          >
            <Send className="h-5 w-5 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}