
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Image as ImageIcon, Phone, Video, Info, Check, CheckCheck, MessageSquare } from 'lucide-react';
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !conversationId || !user || !room) return;

    const messageData = {
      chatRoomId: conversationId,
      senderId: user.uid,
      senderName: user.displayName || user.email,
      senderAvatar: user.photoURL,
      content: inputValue,
      type: 'text',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isEdited: false,
      isDeleted: false,
      readBy: [user.uid],
      chatRoomMembers: room.members, // Denormalized for security rules
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
        <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
          <MessageSquare className="h-10 w-10 text-muted-foreground opacity-20" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Welcome to Kith</h2>
        <p className="text-muted-foreground max-w-sm">
          Select a conversation from the sidebar to start messaging your colleagues and friends.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{room?.name?.[0] || 'C'}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-semibold">{room?.name || 'Group Chat'}</h3>
            <p className="text-[10px] text-muted-foreground">
              {room?.isGroupChat ? 'Group Conversation' : 'Private Conversation'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground"><Phone className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground"><Video className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground"><Info className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages?.map((msg, i) => {
          const isMe = msg.senderId === user?.uid;
          const showAvatar = i === 0 || messages[i-1].senderId !== msg.senderId;
          const timestamp = msg.createdAt?.toDate?.() || new Date();

          return (
            <div key={msg.id} className={cn("flex items-end gap-2 animate-fade-in", isMe ? "flex-row-reverse" : "flex-row")}>
              {!isMe && (
                <div className="w-8 shrink-0">
                  {showAvatar && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.senderAvatar} />
                      <AvatarFallback>{msg.senderName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
              
              <div className={cn(
                "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm chat-bubble-shadow relative",
                isMe 
                  ? "bg-primary text-primary-foreground rounded-br-none" 
                  : "bg-secondary text-foreground rounded-bl-none"
              )}>
                {!isMe && showAvatar && (
                  <p className="text-[10px] font-bold text-accent mb-1 uppercase tracking-tight">{msg.senderName}</p>
                )}
                <p className="leading-relaxed">{msg.content}</p>
                <div className={cn(
                  "flex items-center justify-end gap-1 mt-1 text-[9px]",
                  isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  <span>{format(timestamp, 'HH:mm')}</span>
                  {isMe && (
                    <span>
                      <CheckCheck className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2 max-w-5xl mx-auto">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent"><Paperclip className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent"><ImageIcon className="h-5 w-5" /></Button>
          </div>
          <div className="flex-1 relative">
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message here..."
              className="pr-10 bg-muted/30 border-none h-11 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-full"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors">
              <Smile className="h-5 w-5" />
            </button>
          </div>
          <Button 
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="rounded-full h-11 w-11 p-0 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
