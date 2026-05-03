
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Info, CheckCheck, MessageSquare, Loader2, X, ChevronLeft, Palette, Quote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCollection, useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, arrayUnion, where, limitToLast } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

interface ChatWindowProps {
  conversationId?: string;
  onBack?: () => void;
}

const WALLPAPERS = [
  { id: 'default', name: 'Standard', value: 'transparent' },
  { id: 'slate', name: 'Dark Slate', value: 'hsl(var(--background))' },
  { id: 'ocean', name: 'Deep Sea', value: 'linear-gradient(135deg, #0f172a, #1e293b)' },
];

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [messageLimit, setMessageLimit] = useState(30);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

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
  const { data: messages, isLoading } = useCollection(messagesQuery);

  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages?.length]);

  const handleSend = (type: 'text' | 'image' = 'text', contentString?: string) => {
    const content = contentString || inputValue.trim();
    if (!content || !conversationId || !user || !room) return;
    
    const messageData = {
      chatRoomId: conversationId,
      senderId: user.uid,
      content: type === 'text' ? content : 'Sent an image',
      fileUrl: type === 'image' ? content : null,
      type: type,
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
    
    if (type === 'text') setInputValue('');
  };

  const chatDisplayName = React.useMemo(() => {
    if (!room) return 'Loading...';
    if (!room.isGroupChat && participants && user) {
      const otherUser = participants.find(p => p.id !== user.uid);
      if (otherUser) return otherUser.username;
    }
    return room.name || 'Chat';
  }, [room, participants, user]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
        <MessageSquare className="h-16 w-16 text-primary opacity-20 mb-4" />
        <h2 className="text-2xl font-bold">Your messages</h2>
        <p className="text-muted-foreground text-sm">Select a conversation to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <div className="h-20 px-6 flex items-center justify-between border-b border-white/5 bg-background/40 backdrop-blur-3xl sticky top-0 z-30">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          <div className="flex flex-col">
            <h3 className="text-sm font-bold">{chatDisplayName}</h3>
          </div>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Info className="h-5 w-5 text-muted-foreground" /></Button>
          </SheetTrigger>
          <SheetContent className="bg-card border-white/10">
            <SheetHeader><SheetTitle>Details</SheetTitle></SheetHeader>
            <div className="py-8 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24"><AvatarFallback className="text-2xl">{chatDisplayName?.[0]}</AvatarFallback></Avatar>
                <h2 className="text-xl font-bold">{chatDisplayName}</h2>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-bold text-primary">Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {WALLPAPERS.map(wp => (
                    <button key={wp.id} className="h-12 rounded-lg border border-white/10" style={{ background: wp.value }} onClick={() => updateDocumentNonBlocking(roomRef!, { wallpaper: wp.value })} />
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ background: room?.wallpaper || 'transparent' }}>
        {messages?.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[70%] p-3 rounded-2xl text-sm", isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card border border-white/5 rounded-bl-none")}>
                {msg.type === 'image' ? <img src={msg.fileUrl} className="rounded-lg max-h-60" /> : <p>{msg.content}</p>}
                <div className="text-[9px] opacity-50 text-right mt-1">
                  {msg.createdAt && format(msg.createdAt.toDate(), 'HH:mm')}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-white/5 bg-background/60 backdrop-blur-3xl">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <Input 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
            placeholder="Type a message..." 
            className="bg-white/5 border-none h-12 rounded-xl" 
          />
          <Button onClick={() => handleSend()} disabled={!inputValue.trim()} className="h-12 px-6 rounded-xl">Send</Button>
        </div>
      </div>
    </div>
  );
}
