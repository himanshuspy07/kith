"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Image as ImageIcon, Info, CheckCheck, MessageSquare, Loader2, MoreVertical, Pencil, Trash2, X, Check, Reply, CornerDownRight, UserPlus, Users, ChevronLeft, Palette } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCollection, useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, arrayUnion, arrayRemove, deleteField, where, limitToLast } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

interface ChatWindowProps {
  conversationId?: string;
  onBack?: () => void;
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🙌', '✨'];

const WALLPAPERS = [
  { id: 'default', name: 'Default', value: 'transparent' },
  { id: 'slate', name: 'Slate Night', value: 'hsl(var(--background))' },
  { id: 'ocean', name: 'Ocean Deep', value: 'linear-gradient(to bottom, #0f172a, #1e293b)' },
  { id: 'emerald', name: 'Emerald Forest', value: 'linear-gradient(to bottom, #064e3b, #065f46)' },
  { id: 'midnight', name: 'Midnight Purple', value: 'linear-gradient(to bottom, #1e1b4b, #312e81)' },
  { id: 'sunset', name: 'Sunset Glow', value: 'linear-gradient(to bottom, #451a03, #78350f)' },
];

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [messageLimit, setMessageLimit] = useState(30);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [seenByMessage, setSeenByMessage] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topObserverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    setCurrentTime(Date.now());
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

  const participantMap = React.useMemo(() => {
    const map: Record<string, any> = {};
    participants?.forEach(u => { map[u.id] = u; });
    return map;
  }, [participants]);

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
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && messages && messages.length >= messageLimit) {
          setMessageLimit(prev => prev + 20);
        }
      },
      { threshold: 0.1 }
    );
    if (topObserverRef.current) observer.observe(topObserverRef.current);
    return () => observer.disconnect();
  }, [messages, messageLimit]);

  const chatDisplayName = React.useMemo(() => {
    if (!room) return 'Loading...';
    if (!room.isGroupChat && participants && user) {
      const otherUser = participants.find(p => p.id !== user.uid);
      if (otherUser) return otherUser.username;
    }
    return room.name || 'Chat';
  }, [room, participants, user]);

  const chatDisplayAvatar = React.useMemo(() => {
    if (!room) return null;
    if (!room.isGroupChat && participants && user) {
      const otherUser = participants.find(p => p.id !== user.uid);
      if (otherUser) return otherUser.profilePictureUrl;
    }
    return null;
  }, [room, participants, user]);

  const presenceInfo = React.useMemo(() => {
    if (!room || room.isGroupChat || !participants || !user || !currentTime) return null;
    const otherUser = participants.find(p => p.id !== user.uid);
    if (!otherUser) return null;
    const lastActive = otherUser.lastActiveAt?.toDate?.() || new Date(otherUser.lastActiveAt || currentTime);
    const isOnline = otherUser.onlineStatus && (currentTime - lastActive.getTime() < 120000);
    return isOnline ? 'Active now' : `Last seen ${formatDistanceToNow(lastActive)} ago`;
  }, [room, participants, user, currentTime]);

  useEffect(() => {
    if (user && conversationId && db) {
      if (messages) {
        messages.forEach((msg) => {
          if (!msg.readBy?.includes(user.uid)) {
            const msgRef = doc(db, 'chatRooms', conversationId, 'messages', msg.id);
            updateDocumentNonBlocking(msgRef, { readBy: arrayUnion(user.uid) });
          }
        });
      }
      if (room && !room.readBy?.includes(user.uid)) {
        const roomDocRef = doc(db, 'chatRooms', conversationId);
        updateDocumentNonBlocking(roomDocRef, { readBy: arrayUnion(user.uid) });
      }
    }
  }, [messages, room, user, conversationId, db]);

  useEffect(() => {
    if (messages && messages.length > 0 && !isLoading) {
      const timeout = setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
      return () => clearTimeout(timeout);
    }
  }, [messages?.length, isLoading]);

  const handleSend = (type: 'text' | 'image' = 'text', contentString?: string) => {
    const content = contentString || inputValue.trim();
    if (!content || !conversationId || !user || !room) return;
    const messageData = {
      chatRoomId: conversationId,
      senderId: user.uid,
      content: type === 'text' ? content : 'Sent an image',
      fileUrl: type === 'image' ? content : null,
      type: type,
      replyToId: replyToMessage?.id || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isEdited: false,
      isDeleted: false,
      readBy: [user.uid],
      reactions: {},
    };
    const msgColRef = collection(db, 'chatRooms', conversationId, 'messages');
    addDocumentNonBlocking(msgColRef, messageData);
    
    const roomDocRef = doc(db, 'chatRooms', conversationId);
    updateDocumentNonBlocking(roomDocRef, {
      lastMessageText: type === 'text' ? content : '📷 Image',
      lastMessageSenderId: user.uid,
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
    });
    
    if (type === 'text') setInputValue('');
    setReplyToMessage(null);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!conversationId || !user || !db || !messages) return;
    
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const updates: any = {};
    let alreadyHadThisEmoji = false;

    if (msg.reactions) {
      Object.entries(msg.reactions).forEach(([existingEmoji, uids]) => {
        if (Array.isArray(uids) && uids.includes(user.uid)) {
          updates[`reactions.${existingEmoji}`] = arrayRemove(user.uid);
          if (existingEmoji === emoji) {
            alreadyHadThisEmoji = true;
          }
        }
      });
    }

    if (!alreadyHadThisEmoji) {
      updates[`reactions.${emoji}`] = arrayUnion(user.uid);
    }

    const msgRef = doc(db, 'chatRooms', conversationId, 'messages', messageId);
    updateDocumentNonBlocking(msgRef, updates);
  };

  const isOtherTyping = () => {
    if (!room?.typing || !currentTime) return false;
    return Object.entries(room.typing).some(([uid, ts]: [string, any]) => {
      if (uid === user?.uid) return false;
      const timestamp = ts?.toDate?.()?.getTime() || 0;
      return (currentTime - timestamp) < 4000;
    });
  };

  const handleUpdateRoom = () => {
    if (!roomRef || !newRoomName.trim()) return;
    updateDocumentNonBlocking(roomRef, { name: newRoomName.trim() });
    setNewRoomName('');
    toast({ title: "Room updated" });
  };

  const setWallpaper = (wallpaperValue: string) => {
    if (!roomRef) return;
    updateDocumentNonBlocking(roomRef, { wallpaper: wallpaperValue });
    toast({ title: "Wallpaper updated" });
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
        <div className="h-24 w-24 rounded-full bg-muted/20 flex items-center justify-center mb-6 border border-border/50 shadow-inner">
          <MessageSquare className="h-12 w-12 text-muted-foreground opacity-20" />
        </div>
        <h2 className="text-2xl font-bold mb-3 tracking-tight">Your messages</h2>
        <p className="text-muted-foreground max-w-xs mx-auto text-sm">Send private messages and group chats to your friends on Kith.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <div className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 md:gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2 text-muted-foreground" onClick={onBack}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          <Avatar className="h-9 w-9 md:h-10 md:h-10 border border-border">
            {chatDisplayAvatar && <AvatarImage src={chatDisplayAvatar} />}
            <AvatarFallback className="bg-primary/10 text-primary font-bold uppercase text-xs md:text-sm">{chatDisplayName?.[0] || 'C'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <h3 className="text-xs md:text-sm font-semibold tracking-tight truncate max-w-[140px] md:max-w-[200px]">{chatDisplayName}</h3>
            {isOtherTyping() ? (
              <p className="text-[9px] md:text-[10px] text-accent animate-pulse font-bold uppercase tracking-widest">Typing...</p>
            ) : (
              <p className="text-[9px] md:text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{presenceInfo || (room?.isGroupChat ? 'Group' : 'Active')}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Sheet open={isInfoOpen} onOpenChange={setIsInfoOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/50"><Info className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent className="bg-card border-border sm:max-w-md w-full overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Conversation Details</SheetTitle>
                <SheetDescription>View participants and group settings.</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 py-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <Avatar className="h-24 w-24 border-2 border-primary/20">
                    {chatDisplayAvatar && <AvatarImage src={chatDisplayAvatar} />}
                    <AvatarFallback className="text-2xl">{chatDisplayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{chatDisplayName}</h2>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">{room?.isGroupChat ? 'Group Chat' : 'Private Chat'}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                    <Palette className="h-3 w-3" />
                    Chat Wallpaper
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {WALLPAPERS.map((wp) => (
                      <button
                        key={wp.id}
                        className={cn(
                          "aspect-video rounded-md border-2 transition-all flex items-center justify-center text-[10px] font-bold p-1 overflow-hidden",
                          room?.wallpaper === wp.value ? "border-primary shadow-lg scale-105" : "border-transparent opacity-70 hover:opacity-100"
                        )}
                        style={{ background: wp.value }}
                        onClick={() => setWallpaper(wp.value)}
                      >
                        <span className="bg-black/40 px-1 rounded backdrop-blur-sm truncate">{wp.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {room?.isGroupChat && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Group Name</Label>
                      <div className="flex gap-2">
                        <Input placeholder={room.name} value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="bg-muted/30 border-none h-11" />
                        <Button className="h-11" size="sm" onClick={handleUpdateRoom} disabled={!newRoomName.trim()}><Check className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-4 border-t border-border">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Participants ({participants?.length || 0})</Label>
                  <div className="space-y-2">
                    {participants?.map(u => (
                      <div key={u.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarImage src={u.profilePictureUrl} /><AvatarFallback>{u.username?.[0]}</AvatarFallback></Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{u.username} {u.id === user?.uid && '(You)'}</span>
                            <span className="text-[10px] text-muted-foreground">{u.id === room?.createdBy ? 'Admin' : 'Member'}</span>
                          </div>
                        </div>
                        {u.onlineStatus && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide relative"
        style={{ background: room?.wallpaper || 'transparent' }}
      >
        <div ref={topObserverRef} className="h-10 flex items-center justify-center">
          {isLoading && messageLimit > 30 && <Loader2 className="h-5 w-5 animate-spin text-primary opacity-50" />}
        </div>
        {messages?.map((msg, i) => {
          const isMe = msg.senderId === user?.uid;
          const senderProfile = participantMap[msg.senderId];
          const msgDate = msg.createdAt?.toDate?.() || (currentTime ? new Date(currentTime) : null);
          const prevMsg = i > 0 ? messages[i - 1] : null;
          const showDateHeader = msgDate && (i === 0 || format(prevMsg?.createdAt?.toDate?.() || new Date(currentTime), 'yyyy-MM-dd') !== format(msgDate, 'yyyy-MM-dd'));
          const repliedMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;
          const reactions = msg.reactions || {};

          return (
            <React.Fragment key={msg.id}>
              {showDateHeader && msgDate && (
                <div className="flex justify-center my-6"><span className="px-3 py-1 rounded-full bg-muted/50 text-[10px] text-muted-foreground font-bold uppercase tracking-widest border border-border/30 backdrop-blur-sm">{format(msgDate, 'MMMM d, yyyy')}</span></div>
              )}
              <div className={cn("flex items-end gap-2 group", isMe ? "flex-row-reverse" : "flex-row")}>
                {!isMe && (
                  <Avatar className="h-7 w-7 md:h-8 md:h-8 shrink-0 border border-border/50">
                    <AvatarImage src={senderProfile?.profilePictureUrl} /><AvatarFallback className="text-[10px]">{senderProfile?.username?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                )}
                
                <div className="flex flex-col gap-1 max-w-[85%] md:max-w-[75%]">
                  <div className={cn(
                    "px-3 py-2.5 md:px-4 md:py-3 rounded-2xl text-xs md:text-sm shadow-md transition-all relative group/bubble", 
                    isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card border border-border/50 text-foreground rounded-bl-none",
                    msg.isDeleted && "opacity-40 italic"
                  )}>
                    <div className={cn(
                      "absolute -top-10 opacity-0 group-hover/bubble:opacity-100 transition-opacity bg-background border border-border shadow-xl rounded-full p-1 flex gap-1 z-10",
                      isMe ? "right-0" : "left-0"
                    )}>
                      {EMOJIS.map(e => (
                        <button 
                          key={e} 
                          onClick={() => handleReaction(msg.id, e)} 
                          className="hover:bg-muted p-1.5 rounded-full transition-colors text-sm"
                        >
                          {e}
                        </button>
                      ))}
                    </div>

                    {!isMe && room?.isGroupChat && <p className="text-[10px] font-bold text-accent mb-1 opacity-80 uppercase tracking-tighter">{senderProfile?.username || "User"}</p>}
                    {repliedMsg && (
                      <div className={cn("mb-2 p-2 rounded-lg text-[10px] md:text-xs border-l-4 opacity-70 flex flex-col gap-0.5", isMe ? "bg-primary-foreground/10 border-primary-foreground/50" : "bg-muted border-accent")}>
                        <p className="truncate italic">{repliedMsg.content}</p>
                      </div>
                    )}
                    
                    {msg.type === 'image' && msg.fileUrl ? (
                      <img src={msg.fileUrl} alt="shared" className="rounded-lg mb-2 max-h-60 w-full object-cover border border-border/20" />
                    ) : (
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}

                    <div className={cn("flex items-center justify-end gap-1.5 mt-1 text-[8px] md:text-[9px] font-medium opacity-70", isMe ? "text-primary-foreground/90" : "text-muted-foreground")}>
                      <span>{msgDate ? format(msgDate, 'HH:mm') : '--:--'}</span>
                      {isMe && (
                        <button onClick={() => setSeenByMessage(msg)} className="hover:text-accent transition-colors">
                          <CheckCheck className={cn("h-3 w-3", (msg.readBy?.length || 0) > 1 ? "text-accent" : "")} />
                        </button>
                      )}
                    </div>
                  </div>

                  {Object.keys(reactions).length > 0 && (
                    <div className={cn("flex flex-wrap gap-1", isMe ? "justify-end" : "justify-start")}>
                      {Object.entries(reactions).map(([emoji, uids]: [string, any]) => (
                        <div 
                          key={emoji} 
                          className="bg-muted/80 backdrop-blur-sm border border-border/50 rounded-full px-1.5 py-0.5 flex items-center gap-1 text-[10px] font-bold shadow-sm"
                        >
                          <span>{emoji}</span>
                          <span className="opacity-70">{Array.isArray(uids) ? uids.length : 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 md:p-4 border-t border-border bg-background/95 backdrop-blur-md z-20">
        {replyToMessage && (
          <div className="max-w-5xl mx-auto mb-3 p-3 bg-muted/50 rounded-xl border border-border/50 flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex flex-col gap-0.5 border-l-4 border-primary pl-3 overflow-hidden">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Replying to {participantMap[replyToMessage.senderId]?.username || "User"}</span>
              <p className="text-xs text-muted-foreground truncate">{replyToMessage.content}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setReplyToMessage(null)}><X className="h-4 w-4" /></Button>
          </div>
        )}
        <div className="flex items-center gap-2 md:gap-3 max-w-5xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-10 w-10 rounded-full text-muted-foreground hover:text-accent shrink-0">
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setIsUploading(true); const reader = new FileReader(); reader.onloadend = () => { handleSend('image', reader.result as string); setIsUploading(false); }; reader.readAsDataURL(file); }} />
          <Input 
            value={inputValue} 
            onChange={(e) => { 
              setInputValue(e.target.value); 
              if (!db || !conversationId || !user) return;
              const typingRef = doc(db, 'chatRooms', conversationId);
              updateDocumentNonBlocking(typingRef, { [`typing.${user.uid}`]: serverTimestamp() });
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => { updateDocumentNonBlocking(typingRef, { [`typing.${user.uid}`]: deleteField() }); }, 3000);
            }} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
            placeholder="Start typing..." 
            className="bg-muted/40 border-none h-11 md:h-12 focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl flex-1 min-w-0 shadow-inner" 
          />
          <Button onClick={() => handleSend()} disabled={!inputValue.trim() || isUploading} className="rounded-2xl h-11 md:h-12 px-4 md:px-6 bg-primary hover:bg-primary/90 shadow-lg font-bold shrink-0">
            <Send className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Send</span>
          </Button>
        </div>
      </div>

      <Dialog open={!!seenByMessage} onOpenChange={() => setSeenByMessage(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Message Info</DialogTitle>
            <DialogDescription>See who has viewed your message.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Read By</Label>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
              {seenByMessage?.readBy?.map((uid: string) => {
                const viewer = participantMap[uid];
                if (!viewer) return null;
                return (
                  <div key={uid} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={viewer.profilePictureUrl} />
                      <AvatarFallback>{viewer.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{viewer.username} {uid === user?.uid && '(You)'}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Read</span>
                    </div>
                  </div>
                );
              })}
              {(!seenByMessage?.readBy || seenByMessage.readBy.length === 0) && (
                <p className="text-sm text-muted-foreground italic">No one has read this message yet.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}