
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Image as ImageIcon, Phone, Video, Info, CheckCheck, MessageSquare, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCollection, useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface ChatWindowProps {
  conversationId?: string;
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const db = useFirestore();

  // Fetch room details
  const roomRef = useMemoFirebase(() => {
    if (!db || !conversationId) return null;
    return doc(db, 'chatRooms', conversationId);
  }, [db, conversationId]);
  const { data: room } = useDoc(roomRef);

  // Fetch messages
  const messagesQuery = useMemoFirebase(() => {
    if (!db || !conversationId) return null;
    return query(
      collection(db, 'chatRooms', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );
  }, [db, conversationId]);
  const { data: messages, isLoading } = useCollection(messagesQuery);

  useEffect(() => {
    if (messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !conversationId || !user || !room) return;

    const messageData = {
      chatRoomId: conversationId,
      senderId: user.uid,
      content: inputValue,
      type: 'text',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isEdited: false,
      isDeleted: false,
      readBy: [user.uid],
      reactions: [],
      chatRoomMembers: room.members || {}, // Denormalized for security rules
    };

    // Add message to subcollection
    const msgColRef = collection(db, 'chatRooms', conversationId, 'messages');
    addDocumentNonBlocking(msgColRef, messageData);

    // Update room with last message preview
    const roomDocRef = doc(db, 'chatRooms', conversationId);
    updateDocumentNonBlocking(roomDocRef, {
      lastMessageText: inputValue,
      updatedAt: serverTimestamp(),
    });

    setInputValue('');
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
        <div className="h-24 w-24 rounded-full bg-muted/20 flex items-center justify-center mb-6 border border-border/50 shadow-inner">
          <MessageSquare className="h-12 w-12 text-muted-foreground opacity-20" />
        </div>
        <h2 className="text-2xl font-bold mb-3 tracking-tight">Your messages</h2>
        <p className="text-muted-foreground max-w-xs mx-auto text-sm">
          Send private messages and group chats to your friends on Kith.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {room?.name?.[0] || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold tracking-tight">{room?.name || 'Loading...'}</h3>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {room?.isGroupChat ? 'Group' : 'Direct Message'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/50"><Phone className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/50"><Video className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/50"><Info className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-[0.98]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground animate-pulse">Syncing messages...</p>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30">
            <p className="text-sm italic">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === user?.uid;
            const prevMsg = i > 0 ? messages[i - 1] : null;
            const msgDate = msg.createdAt?.toDate?.() || new Date();
            const prevMsgDate = prevMsg?.createdAt?.toDate?.() || new Date();
            
            const showDateHeader = i === 0 || format(prevMsgDate, 'yyyy-MM-dd') !== format(msgDate, 'yyyy-MM-dd');

            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="flex justify-center my-6">
                    <span className="px-3 py-1 rounded-full bg-muted/50 text-[10px] text-muted-foreground font-bold uppercase tracking-widest border border-border/30">
                      {format(msgDate, 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}
                <div className={cn("flex items-end gap-2 group", isMe ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-md transition-all group-hover:shadow-lg relative",
                    isMe 
                      ? "bg-primary text-primary-foreground rounded-br-none" 
                      : "bg-card border border-border/50 text-foreground rounded-bl-none"
                  )}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <div className={cn(
                      "flex items-center justify-end gap-1.5 mt-1.5 text-[9px] font-medium opacity-70",
                      isMe ? "text-primary-foreground/90" : "text-muted-foreground"
                    )}>
                      <span>{format(msgDate, 'HH:mm')}</span>
                      {isMe && <CheckCheck className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-accent rounded-full"><Paperclip className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-accent rounded-full"><ImageIcon className="h-5 w-5" /></Button>
          </div>
          <div className="flex-1 relative">
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Start typing..."
              className="pr-12 bg-muted/40 border-none h-12 focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors">
              <Smile className="h-5 w-5" />
            </button>
          </div>
          <Button 
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="rounded-2xl h-12 px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold transition-all active:scale-95"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
