"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Info, MessageSquare, ChevronLeft, Plus, Image as ImageIcon, Smile, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
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
  { id: 'none', name: 'Clean', value: 'transparent', preview: 'bg-background' },
  { id: 'midnight', name: 'Midnight', value: 'linear-gradient(180deg, #020617 0%, #0f172a 100%)', preview: 'bg-slate-900' },
  { id: 'abyss', name: 'Abyss', value: 'radial-gradient(circle at center, #1e1b4b, #020617)', preview: 'bg-indigo-950' },
  { id: 'forest', name: 'Deep Forest', value: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', preview: 'bg-emerald-950' },
  { id: 'crimson', name: 'Crimson Night', value: 'linear-gradient(135deg, #450a0a 0%, #000000 100%)', preview: 'bg-red-950' },
  { id: 'nordic', name: 'Nordic Blue', value: 'linear-gradient(to right, #0f172a, #334155)', preview: 'bg-blue-900' },
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
    if (!room) return 'Loading...';
    if (!room.isGroupChat && participants && user) {
      const otherUser = participants.find(p => p.id !== user.uid);
      if (otherUser) return otherUser.username;
    }
    return room.name || 'Conversation';
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
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-background">
        <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mb-6 animate-pulse">
          <MessageSquare className="h-10 w-10 text-muted-foreground opacity-20" />
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Select a Conversation</h2>
        <p className="text-muted-foreground text-sm max-w-[250px]">Choose a friend or group from the sidebar to start messaging.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 transition-all duration-700 ease-in-out pointer-events-none"
        style={{ background: room?.wallpaper || 'transparent' }}
      />
      
      {/* Header */}
      <header className="h-20 px-6 flex items-center justify-between glass-morphism sticky top-0 z-10 mx-4 mt-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10 border border-white/10 ring-2 ring-primary/10">
            <AvatarImage src={chatAvatar || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary font-bold">{chatDisplayName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold leading-none">{chatDisplayName}</h3>
            <span className="text-[10px] text-accent uppercase tracking-widest mt-1 font-bold animate-pulse">Live Connection</span>
          </div>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5">
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card/95 backdrop-blur-xl border-white/10 sm:max-w-md">
            <SheetHeader className="pb-8">
              <SheetTitle>Chat Customization</SheetTitle>
              <SheetDescription>Personalize your experience for this conversation.</SheetDescription>
            </SheetHeader>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-primary">Chat Wallpaper</Label>
                <div className="grid grid-cols-2 gap-3">
                  {WALLPAPERS.map(wp => (
                    <button 
                      key={wp.id} 
                      onClick={() => roomRef && updateDocumentNonBlocking(roomRef, { wallpaper: wp.value })}
                      className={cn(
                        "group relative h-20 w-full rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02]",
                        room?.wallpaper === wp.value ? "border-primary shadow-lg shadow-primary/20" : "border-white/5"
                      )}
                    >
                      <div className={cn("absolute inset-0", wp.preview)} style={{ background: wp.value }} />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-bold uppercase tracking-wider">{wp.name}</span>
                      </div>
                      {room?.wallpaper === wp.value && (
                        <div className="absolute top-2 right-2 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                          <Plus className="h-3 w-3 rotate-45" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scrollbar-hide z-[1]">
        {messages?.map((msg, idx) => {
          const isMe = msg.senderId === user?.uid;
          const showTime = idx === 0 || 
            (msg.createdAt && messages[idx-1].createdAt && 
             msg.createdAt.toDate().getTime() - messages[idx-1].createdAt.toDate().getTime() > 300000);

          return (
            <div key={msg.id} className={cn("flex flex-col animate-in-fade", isMe ? "items-end" : "items-start")}>
              {showTime && (
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 mb-4 w-full text-center">
                  {msg.createdAt && format(msg.createdAt.toDate(), 'EEEE, HH:mm')}
                </span>
              )}
              <div className={cn(
                "max-w-[80%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-lg transition-transform",
                isMe 
                  ? "bg-primary text-primary-foreground rounded-br-none message-shadow-me" 
                  : "bg-white/[0.05] backdrop-blur-md border border-white/5 text-foreground rounded-bl-none message-shadow"
              )}>
                {msg.content}
              </div>
              <div className="mt-1.5 px-1 flex items-center gap-1.5">
                <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">
                  {msg.createdAt && format(msg.createdAt.toDate(), 'HH:mm')}
                </span>
                {isMe && <div className="h-1 w-1 rounded-full bg-accent" />}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-transparent z-10">
        <div className="max-w-4xl mx-auto flex items-end gap-3 glass-morphism p-3 rounded-[2rem] shadow-2xl">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/10 shrink-0">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div className="flex-1">
            <Input 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
              placeholder="Message your kith..." 
              className="bg-transparent border-none h-10 px-4 focus-visible:ring-0 text-sm placeholder:text-muted-foreground/40" 
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/10 hidden sm:flex">
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={!inputValue.trim()} 
              className={cn(
                "h-10 w-10 rounded-full transition-all active:scale-90",
                inputValue.trim() ? "bg-primary text-white" : "bg-muted/20 text-muted-foreground"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}