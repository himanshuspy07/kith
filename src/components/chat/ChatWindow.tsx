
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Image as ImageIcon, Phone, Video, Info, Check, CheckCheck } from 'lucide-react';
import { MOCK_MESSAGES, MOCK_CONVERSATIONS, CURRENT_USER, Message } from '@/lib/mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  conversationId?: string;
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = MOCK_CONVERSATIONS.find(c => c.id === conversationId);
  const partner = conversation?.participants.find(p => p.id !== CURRENT_USER.id);
  const chatName = conversation?.type === 'group' ? conversation.name : partner?.name;

  useEffect(() => {
    if (conversationId) {
      setMessages(MOCK_MESSAGES[conversationId] || []);
    }
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !conversationId) return;

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: CURRENT_USER.id,
      text: inputValue,
      timestamp: new Date().toISOString(),
      status: 'sent',
      type: 'text',
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    // Simulate reply
    setTimeout(() => {
      const reply: Message = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: partner?.id || 'bot',
        text: "I'm working on that right now!",
        timestamp: new Date().toISOString(),
        status: 'delivered',
        type: 'text',
      };
      setMessages(prev => [...prev, reply]);
    }, 1500);
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
            <AvatarImage src={conversation?.type === 'group' ? undefined : partner?.avatar} />
            <AvatarFallback>{chatName?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-semibold">{chatName}</h3>
            <p className="text-[10px] text-muted-foreground">
              {conversation?.type === 'group' ? `${conversation.participants.length} members` : partner?.status === 'online' ? 'Online' : partner?.lastSeen ? `Last seen ${partner.lastSeen}` : 'Offline'}
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
        {messages.map((msg, i) => {
          const isMe = msg.senderId === CURRENT_USER.id;
          const showAvatar = i === 0 || messages[i-1].senderId !== msg.senderId;
          const sender = conversation?.participants.find(p => p.id === msg.senderId);

          return (
            <div key={msg.id} className={cn("flex items-end gap-2 animate-fade-in", isMe ? "flex-row-reverse" : "flex-row")}>
              {!isMe && (
                <div className="w-8 shrink-0">
                  {showAvatar && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={sender?.avatar} />
                      <AvatarFallback>{sender?.name[0]}</AvatarFallback>
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
                {!isMe && conversation?.type === 'group' && showAvatar && (
                  <p className="text-[10px] font-bold text-accent mb-1 uppercase tracking-tight">{sender?.name}</p>
                )}
                <p className="leading-relaxed">{msg.text}</p>
                <div className={cn(
                  "flex items-center justify-end gap-1 mt-1 text-[9px]",
                  isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  <span>{format(new Date(msg.timestamp), 'HH:mm')}</span>
                  {isMe && (
                    <span>
                      {msg.status === 'read' ? <CheckCheck className="h-3 w-3 text-accent" /> : <Check className="h-3 w-3" />}
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

function MessageSquare({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
