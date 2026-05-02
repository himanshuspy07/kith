
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Image as ImageIcon, Info, CheckCheck, MessageSquare, Loader2, MoreVertical, Pencil, Trash2, X, Check, Reply, CornerDownRight, UserPlus, Users, ChevronLeft, Palette, Quote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  { id: 'default', name: 'Standard', value: 'transparent' },
  { id: 'slate', name: 'Dark Slate', value: 'hsl(var(--background))' },
  { id: 'ocean', name: 'Deep Sea', value: 'linear-gradient(135deg, #0f172a, #1e293b)' },
  { id: 'emerald', name: 'Emerald', value: 'linear-gradient(135deg, #064e3b, #065f46)' },
  { id: 'midnight', name: 'Royal', value: 'linear-gradient(135deg, #1e1b4b, #312e81)' },
  { id: 'sunset', name: 'Desert', value: 'linear-gradient(135deg, #451a03, #78350f)' },
];

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [messageLimit, setMessageLimit] = useState(30);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [seenByMessage, setSeenByMessage] = useState<any>(null);
  
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
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

  const chatDisplayBio = React.useMemo(() => {
    if (!room || room.isGroupChat || !participants || !user) return null;
    const otherUser = participants.find(p => p.id !== user.uid);
    return otherUser?.bio;
  }, [room, participants, user]);

  const presenceInfo = React.useMemo(() => {
    if (!room || room.isGroupChat || !participants || !user || !currentTime) return null;
    const otherUser = participants.find(p => p.id !== user.uid);
    if (!otherUser) return null;
    const lastActive = otherUser.lastActiveAt?.toDate?.() || new Date(otherUser.lastActiveAt || currentTime);
    const isOnline = otherUser.onlineStatus && (currentTime - lastActive.getTime() < 120000);
    return isOnline ? 'Online' : `Seen ${formatDistanceToNow(lastActive)} ago`;
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

  const handleEditMessage = () => {
    if (!editingMessageId || !editValue.trim() || !conversationId || !db) return;
    const msgRef = doc(db, 'chatRooms', conversationId, 'messages', editingMessageId);
    updateDocumentNonBlocking(msgRef, {
      content: editValue.trim(),
      isEdited: true,
      updatedAt: serverTimestamp()
    });
    setEditingMessageId(null);
    setEditValue('');
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!conversationId || !db) return;
    const msgRef = doc(db, 'chatRooms', conversationId, 'messages', messageId);
    updateDocumentNonBlocking(msgRef, {
      content: 'This message was deleted',
      isDeleted: true,
      fileUrl: null,
      updatedAt: serverTimestamp()
    });
    toast({ title: "Message deleted" });
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!conversationId || !user || !db || !messages) return;
    
    const msg = messages.find(m => m.id === messageId);
    if (!msg || msg.isDeleted) return;

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
    updateDocumentNonBlocking(roomRef, { 
      name: newRoomName.trim(),
      nameLowercase: newRoomName.trim().toLowerCase()
    });
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
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] opacity-30" />
        <div className="h-28 w-28 rounded-3xl bg-white/5 flex items-center justify-center mb-8 border border-white/5 shadow-2xl backdrop-blur-3xl z-10 animate-pulse">
          <MessageSquare className="h-12 w-12 text-primary opacity-40" />
        </div>
        <h2 className="text-3xl font-bold mb-4 tracking-tight z-10">Start a conversation</h2>
        <p className="text-muted-foreground max-w-xs mx-auto text-sm leading-relaxed z-10 opacity-60 uppercase tracking-widest font-medium">Select a friend to begin chatting professionally.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <div className="h-20 px-6 flex items-center justify-between border-b border-white/5 bg-background/40 backdrop-blur-3xl sticky top-0 z-30 shadow-xl">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-10 w-10 -ml-2 text-muted-foreground/60 rounded-full" onClick={onBack}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          <Avatar className="h-11 w-11 border border-white/10 shadow-lg">
            {chatDisplayAvatar && <AvatarImage src={chatDisplayAvatar} />}
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{chatDisplayName?.[0] || 'C'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold tracking-tight">{chatDisplayName}</h3>
            {isOtherTyping() ? (
              <p className="text-[10px] text-accent animate-pulse font-bold uppercase tracking-[0.2em]">Typing...</p>
            ) : (
              <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest">{presenceInfo}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={isInfoOpen} onOpenChange={setIsInfoOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground/40 hover:text-primary hover:bg-white/5 rounded-full"><Info className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent className="bg-card/95 backdrop-blur-2xl border-white/10 sm:max-w-md w-full overflow-y-auto shadow-2xl">
              <SheetHeader>
                <SheetTitle className="text-2xl font-bold tracking-tight">Conversation</SheetTitle>
              </SheetHeader>
              <div className="space-y-8 py-8">
                <div className="flex flex-col items-center gap-5 text-center">
                  <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-2xl">
                    {chatDisplayAvatar && <AvatarImage src={chatDisplayAvatar} />}
                    <AvatarFallback className="text-4xl font-bold">{chatDisplayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{chatDisplayName}</h2>
                    <Badge variant="outline" className="mt-2 uppercase tracking-widest font-bold text-[9px] bg-primary/10 text-primary border-none">{room?.isGroupChat ? 'Group' : 'Direct'}</Badge>
                  </div>
                  {chatDisplayBio && (
                    <div className="px-6 py-4 bg-white/5 rounded-2xl relative">
                      <Quote className="absolute -top-2 -left-2 h-4 w-4 text-primary/40 rotate-180" />
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        {chatDisplayBio}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-primary flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Custom Theme
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {WALLPAPERS.map((wp) => (
                      <button
                        key={wp.id}
                        className={cn(
                          "aspect-square rounded-2xl border-2 transition-all flex items-center justify-center p-2 overflow-hidden shadow-xl",
                          room?.wallpaper === wp.value ? "border-primary scale-105" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                        style={{ background: wp.value }}
                        onClick={() => setWallpaper(wp.value)}
                      >
                        <span className="text-[8px] font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded-full backdrop-blur-md">{wp.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {room?.isGroupChat && (
                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-primary">Group Controls</Label>
                    <div className="flex gap-2">
                      <Input placeholder="Rename group..." value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="bg-white/5 border-none h-12 rounded-xl" />
                      <Button className="h-12 w-12 rounded-xl" onClick={handleUpdateRoom} disabled={!newRoomName.trim()}><Check className="h-5 w-5" /></Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-6 border-t border-white/5">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-primary">Participants ({participants?.length || 0})</Label>
                  <div className="space-y-3">
                    {participants?.map(u => (
                      <div key={u.id} className="flex flex-col bg-white/5 p-4 rounded-2xl gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-white/10"><AvatarImage src={u.profilePictureUrl} /><AvatarFallback>{u.username?.[0]}</AvatarFallback></Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">{u.username}</span>
                              <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-tighter">{u.id === room?.createdBy ? 'Admin' : 'Member'}</span>
                            </div>
                          </div>
                          {u.onlineStatus && <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(166,245,217,0.5)]" />}
                        </div>
                        {u.bio && <p className="text-[10px] text-muted-foreground/60 italic px-1">{u.bio}</p>}
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
        className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide relative"
        style={{ background: room?.wallpaper || 'transparent' }}
      >
        <div ref={topObserverRef} className="h-8 flex items-center justify-center">
          {isLoading && messageLimit > 30 && <Loader2 className="h-5 w-5 animate-spin text-primary/40" />}
        </div>
        {messages?.map((msg, i) => {
          const isMe = msg.senderId === user?.uid;
          const isAdmin = room?.createdBy === user?.uid;
          const canDelete = isMe || isAdmin;
          
          const senderProfile = participantMap[msg.senderId];
          const msgDate = msg.createdAt?.toDate?.() || (currentTime ? new Date(currentTime) : null);
          const prevMsg = i > 0 ? messages[i - 1] : null;
          const showDateHeader = msgDate && (i === 0 || format(prevMsg?.createdAt?.toDate?.() || new Date(currentTime), 'yyyy-MM-dd') !== format(msgDate, 'yyyy-MM-dd'));
          const repliedMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;
          const reactions = msg.reactions || {};
          const isEditing = editingMessageId === msg.id;

          return (
            <React.Fragment key={msg.id}>
              {showDateHeader && msgDate && (
                <div className="flex justify-center my-8">
                  <span className="px-4 py-1.5 rounded-full bg-white/5 text-[9px] text-muted-foreground font-bold uppercase tracking-[0.3em] border border-white/5 backdrop-blur-md">
                    {format(msgDate, 'MMMM d, yyyy')}
                  </span>
                </div>
              )}
              <div className={cn("flex items-end gap-3 group animate-in fade-in slide-in-from-bottom-2", isMe ? "flex-row-reverse" : "flex-row")}>
                {!isMe && (
                  <Avatar className="h-8 w-8 shrink-0 border border-white/10 shadow-md">
                    <AvatarImage src={senderProfile?.profilePictureUrl} /><AvatarFallback className="text-[10px]">{senderProfile?.username?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                )}
                
                <div className="flex flex-col gap-1.5 max-w-[80%] md:max-w-[70%]">
                  <div className={cn(
                    "px-4 py-3.5 rounded-[1.5rem] text-sm shadow-2xl transition-all relative group/bubble backdrop-blur-3xl", 
                    isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card/40 border border-white/5 text-foreground rounded-bl-none",
                    msg.isDeleted && "opacity-40 italic",
                    isEditing && "ring-2 ring-accent ring-offset-2 ring-offset-background"
                  )}>
                    
                    {!msg.isDeleted && !isEditing && (
                      <div className={cn(
                        "absolute -top-12 opacity-0 group-hover/bubble:opacity-100 transition-all scale-95 group-hover/bubble:scale-100 bg-background/80 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl p-1.5 flex gap-1.5 z-40",
                        isMe ? "right-0" : "left-0"
                      )}>
                        {EMOJIS.map(e => (
                          <button 
                            key={e} 
                            onClick={() => handleReaction(msg.id, e)} 
                            className="hover:bg-white/10 p-2 rounded-xl transition-colors text-lg"
                          >
                            {e}
                          </button>
                        ))}
                        <div className="w-px h-5 bg-white/10 mx-1 my-auto" />
                        <button onClick={() => setReplyToMessage(msg)} className="hover:bg-white/10 p-2 rounded-xl text-muted-foreground"><Reply className="h-4 w-4" /></button>
                        {isMe && (
                          <button onClick={() => { setEditingMessageId(msg.id); setEditValue(msg.content); }} className="hover:bg-white/10 p-2 rounded-xl text-accent"><Pencil className="h-4 w-4" /></button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDeleteMessage(msg.id)} className="hover:bg-white/10 p-2 rounded-xl text-destructive"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    )}

                    {!isMe && room?.isGroupChat && <p className="text-[10px] font-bold text-accent mb-1.5 opacity-80 uppercase tracking-widest">{senderProfile?.username || "User"}</p>}
                    
                    {repliedMsg && (
                      <div className={cn("mb-3 p-3 rounded-xl text-[10px] md:text-xs border-l-2 opacity-60 bg-black/20", isMe ? "border-primary-foreground" : "border-accent")}>
                        <p className="truncate italic font-medium">{repliedMsg.content}</p>
                      </div>
                    )}
                    
                    {isEditing ? (
                      <div className="space-y-3 py-1">
                        <Input 
                          value={editValue} 
                          onChange={(e) => setEditValue(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleEditMessage()}
                          className="bg-black/20 border-none h-10 text-sm focus-visible:ring-0" 
                          autoFocus
                        />
                        <div className="flex gap-4 justify-end">
                          <button onClick={() => setEditingMessageId(null)} className="text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                          <button onClick={handleEditMessage} className="text-[10px] uppercase font-bold text-accent hover:opacity-80 transition-colors">Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.type === 'image' && msg.fileUrl ? (
                          <img src={msg.fileUrl} alt="shared" className="rounded-2xl mb-2 max-h-72 w-full object-cover border border-white/5" />
                        ) : (
                          <p className="leading-[1.6] tracking-tight">{msg.content}</p>
                        )}
                      </>
                    )}

                    {!isEditing && (
                      <div className={cn("flex items-center justify-end gap-2 mt-2 text-[9px] font-bold opacity-40 uppercase tracking-widest", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                        {msg.isEdited && <span className="italic mr-1 text-[8px]">(edited)</span>}
                        <span>{msgDate ? format(msgDate, 'HH:mm') : ''}</span>
                        {isMe && (
                          <button onClick={() => setSeenByMessage(msg)} className="hover:text-accent transition-colors">
                            <CheckCheck className={cn("h-3.5 w-3.5", (msg.readBy?.length || 0) > 1 ? "text-accent" : "")} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {Object.keys(reactions).length > 0 && (
                    <div className={cn("flex flex-wrap gap-1.5", isMe ? "justify-end" : "justify-start")}>
                      {Object.entries(reactions).map(([emoji, uids]: [string, any]) => (
                        <div 
                          key={emoji} 
                          className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-full px-2 py-1 flex items-center gap-1.5 text-[10px] font-bold shadow-xl"
                        >
                          <span>{emoji}</span>
                          <span className="opacity-50">{Array.isArray(uids) ? uids.length : 0}</span>
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

      <div className="p-6 md:p-8 border-t border-white/5 bg-background/60 backdrop-blur-3xl z-30">
        {replyToMessage && (
          <div className="max-w-4xl mx-auto mb-4 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between animate-in slide-in-from-bottom-4">
            <div className="flex flex-col gap-1 border-l-2 border-primary pl-4 overflow-hidden">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Replying to {participantMap[replyToMessage.senderId]?.username}</span>
              <p className="text-xs text-muted-foreground/60 truncate italic">{replyToMessage.content}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10" onClick={() => setReplyToMessage(null)}><X className="h-4 w-4" /></Button>
          </div>
        )}
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-12 w-12 rounded-2xl text-muted-foreground/40 hover:text-primary hover:bg-white/5 shrink-0 transition-all">
            {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setIsUploading(true); const reader = new FileReader(); reader.onloadend = () => { handleSend('image', reader.result as string); setIsUploading(false); }; reader.readAsDataURL(file); }} />
          <div className="flex-1 relative">
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
              placeholder="Write a message..." 
              className="bg-white/5 border-none h-14 md:h-16 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-3xl px-6 text-sm shadow-inner" 
            />
          </div>
          <Button onClick={() => handleSend()} disabled={!inputValue.trim() || isUploading} className="rounded-3xl h-14 md:h-16 w-14 md:w-28 bg-primary hover:bg-primary/90 shadow-2xl font-bold shrink-0 transition-transform active:scale-95">
            <Send className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline uppercase tracking-widest text-xs">Send</span>
          </Button>
        </div>
      </div>

      <Dialog open={!!seenByMessage} onOpenChange={() => setSeenByMessage(null)}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-white/10 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Read Receipts</DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-widest font-bold opacity-40">Participants who viewed this</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto scrollbar-hide pr-2">
            {seenByMessage?.readBy?.map((uid: string) => {
              const viewer = participantMap[uid];
              if (!viewer) return null;
              return (
                <div key={uid} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl animate-in fade-in zoom-in-95">
                  <Avatar className="h-10 w-10 border border-white/10 shadow-lg">
                    <AvatarImage src={viewer.profilePictureUrl} />
                    <AvatarFallback>{viewer.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold tracking-tight">{viewer.username} {uid === user?.uid && '(You)'}</span>
                    <span className="text-[10px] text-accent uppercase font-bold tracking-widest mt-0.5">Viewed</span>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
