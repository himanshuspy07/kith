
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, ChevronLeft, Plus, Image as ImageIcon, Smile, MoreHorizontal, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCollection, useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, where, limitToLast } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

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

const COMMON_EMOJIS = ["😊", "😂", "🥰", "👍", "🔥", "🚀", "❤️", "✨", "🙏", "😎", "🙌", "🤔", "🎉", "👋", "😭", "💯"];

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [messageLimit] = useState(50);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

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

  const handleSend = (type: 'text' | 'image' = 'text', content?: string) => {
    const finalContent = content || inputValue.trim();
    if (!finalContent || !conversationId || !user || !room) return;
    
    const messageData = {
      chatRoomId: conversationId,
      senderId: user.uid,
      content: finalContent,
      type: type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
    };

    addDocumentNonBlocking(collection(db, 'chatRooms', conversationId, 'messages'), messageData);
    updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId), {
      lastMessageText: type === 'image' ? 'Sent a photo' : finalContent,
      lastMessageSenderId: user.uid,
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
    });
    
    if (type === 'text') setInputValue('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Image must be under 5MB.",
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      handleSend('image', reader.result as string);
      setIsUploading(false);
      toast({ title: "Image Sent" });
    };
    reader.onerror = () => {
      setIsUploading(false);
      toast({ variant: "destructive", title: "Failed to send image" });
    };
    reader.readAsDataURL(file);
  };

  const addEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
  };

  const chatDisplayName = React.useMemo(() => {
    if (!room) return 'Loading...';
    if (!room.isGroupChat && participants && user) {
      const otherUser = participants.find(p => p.id !== user.uid);
      if (otherUser) return otherUserProfile?.username || otherUser.username;
    }
    return room.name || 'Conversation';
  }, [room, participants, user]);

  const otherUserProfile = React.useMemo(() => {
    if (!room || room.isGroupChat || !participants || !user) return null;
    return participants.find(p => p.id !== user.uid);
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
      <div 
        className="absolute inset-0 z-0 transition-all duration-700 ease-in-out pointer-events-none opacity-40"
        style={{ background: room?.wallpaper || 'transparent' }}
      />
      
      <header className="h-20 px-6 flex items-center justify-between glass-morphism sticky top-0 z-10 mx-4 mt-4 rounded-2xl shadow-lg border-white/5">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10 border border-white/10 ring-2 ring-primary/10">
            <AvatarImage src={otherUserProfile?.profilePictureUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-primary/20 text-primary font-bold">{chatDisplayName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold leading-none">{chatDisplayName}</h3>
            <span className="text-[10px] text-accent uppercase tracking-widest mt-1 font-bold animate-pulse">Live Link</span>
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
              <SheetTitle>Chat Personalization</SheetTitle>
              <SheetDescription>Set a unique wallpaper for this conversation.</SheetDescription>
            </SheetHeader>
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-widest text-primary">Aesthetic Wallpapers</Label>
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
                  </button>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scrollbar-hide z-[1]">
        {messages?.map((msg, idx) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={cn("flex flex-col animate-in-fade", isMe ? "items-end" : "items-start")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl text-[13px] leading-relaxed shadow-lg transition-transform overflow-hidden",
                isMe 
                  ? "bg-primary text-primary-foreground rounded-br-none message-shadow-me" 
                  : "bg-white/[0.05] backdrop-blur-md border border-white/5 text-foreground rounded-bl-none message-shadow",
                msg.type === 'image' ? 'p-1' : 'p-4'
              )}>
                {msg.type === 'image' ? (
                  <img src={msg.content} alt="Shared" className="rounded-xl max-w-full h-auto object-cover max-h-96" />
                ) : (
                  msg.content
                )}
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

      <div className="p-6 bg-transparent z-10">
        <div className="max-w-4xl mx-auto flex items-end gap-3 glass-morphism p-3 rounded-[2rem] shadow-2xl border-white/5">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full hover:bg-white/10 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
          </Button>
          <div className="flex-1">
            <Input 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
              placeholder="Message kith..." 
              className="bg-transparent border-none h-10 px-4 focus-visible:ring-0 text-sm placeholder:text-muted-foreground/40" 
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/10 hidden sm:flex">
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 bg-card/90 backdrop-blur-xl border-white/10 rounded-2xl mb-4">
                <div className="grid grid-cols-4 gap-2">
                  {COMMON_EMOJIS.map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={() => addEmoji(emoji)}
                      className="h-10 w-10 flex items-center justify-center text-xl hover:bg-white/10 rounded-xl transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button 
              onClick={() => handleSend()} 
              disabled={!inputValue.trim() || isUploading} 
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
