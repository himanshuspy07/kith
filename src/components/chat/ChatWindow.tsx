
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Image as ImageIcon, Info, CheckCheck, MessageSquare, Loader2, MoreVertical, Pencil, Trash2, X, Check, Reply, CornerDownRight, UserPlus, Users, ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCollection, useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, arrayUnion, deleteField, where, limitToLast } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

interface ChatWindowProps {
  conversationId?: string;
  onBack?: () => void;
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [messageLimit, setMessageLimit] = useState(30);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [userSearch, setUserSearch] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topObserverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  const availableUsersQuery = useMemoFirebase(() => {
    if (!db || !userSearch || userSearch.length < 2) return null;
    return query(
      collection(db, 'users'),
      where('username', '>=', userSearch),
      where('username', '<=', userSearch + '\uf8ff')
    );
  }, [db, userSearch]);
  const { data: searchResults } = useCollection(availableUsersQuery);

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
    if (!room || room.isGroupChat || !participants || !user) return null;
    const otherUser = participants.find(p => p.id !== user.uid);
    if (!otherUser) return null;
    const lastActive = otherUser.lastActiveAt?.toDate?.() || new Date(otherUser.lastActiveAt || Date.now());
    const isOnline = otherUser.onlineStatus && (Date.now() - lastActive.getTime() < 120000);
    return isOnline ? 'Active now' : `Last seen ${formatDistanceToNow(lastActive)} ago`;
  }, [room, participants, user]);

  useEffect(() => {
    if (messages && user && conversationId && db) {
      messages.forEach((msg) => {
        if (!msg.readBy?.includes(user.uid)) {
          const msgRef = doc(db, 'chatRooms', conversationId, 'messages', msg.id);
          updateDocumentNonBlocking(msgRef, { readBy: arrayUnion(user.uid) });
        }
      });
    }
  }, [messages, user, conversationId, db]);

  useEffect(() => {
    if (messages && messages.length > 0 && !isLoading) {
      const timeout = setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
      return () => clearTimeout(timeout);
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
      replyToId: replyToMessage?.id || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isEdited: false,
      isDeleted: false,
      readBy: [user.uid],
      reactions: [],
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

  const isOtherTyping = () => {
    if (!room?.typing) return false;
    const now = Date.now();
    return Object.entries(room.typing).some(([uid, ts]: [string, any]) => {
      if (uid === user?.uid) return false;
      const timestamp = ts?.toDate?.()?.getTime() || 0;
      return (now - timestamp) < 4000;
    });
  };

  const handleUpdateRoom = () => {
    if (!roomRef || !newRoomName.trim()) return;
    updateDocumentNonBlocking(roomRef, { name: newRoomName.trim() });
    setNewRoomName('');
    toast({ title: "Room updated" });
  };

  const handleAddMember = (targetUser: any) => {
    if (!roomRef || room?.memberIds.includes(targetUser.id)) return;
    updateDocumentNonBlocking(roomRef, {
      memberIds: arrayUnion(targetUser.id),
      [`members.${targetUser.id}`]: true
    });
    toast({ title: `${targetUser.username} added to group` });
    setUserSearch('');
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
      <div className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
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

                {room?.isGroupChat && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Group Name</Label>
                      <div className="flex gap-2">
                        <Input placeholder={room.name} value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="bg-muted/30 border-none h-11" />
                        <Button className="h-11" size="sm" onClick={handleUpdateRoom} disabled={!newRoomName.trim()}><Check className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Add Members</Label>
                      <div className="relative">
                        <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="bg-muted/30 border-none pl-9 h-11" />
                        <Users className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      </div>
                      {searchResults && searchResults.length > 0 && (
                        <div className="bg-muted/20 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                          {searchResults.filter(u => !room.memberIds.includes(u.id)).map(u => (
                            <div key={u.id} className="flex items-center justify-between p-2 hover:bg-muted/40 rounded-md">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6"><AvatarImage src={u.profilePictureUrl} /><AvatarFallback>{u.username?.[0]}</AvatarFallback></Avatar>
                                <span className="text-xs font-medium">{u.username}</span>
                              </div>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleAddMember(u)}><UserPlus className="h-4 w-4" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
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

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide">
        <div ref={topObserverRef} className="h-10 flex items-center justify-center">
          {isLoading && messageLimit > 30 && <Loader2 className="h-5 w-5 animate-spin text-primary opacity-50" />}
        </div>
        {messages?.map((msg, i) => {
          const isMe = msg.senderId === user?.uid;
          const senderProfile = participantMap[msg.senderId];
          const msgDate = msg.createdAt?.toDate?.() || new Date();
          const prevMsg = i > 0 ? messages[i - 1] : null;
          const showDateHeader = i === 0 || format(prevMsg?.createdAt?.toDate?.() || new Date(), 'yyyy-MM-dd') !== format(msgDate, 'yyyy-MM-dd');
          const repliedMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;
          const repliedSender = repliedMsg ? participantMap[repliedMsg.senderId] : null;
          return (
            <React.Fragment key={msg.id}>
              {showDateHeader && (
                <div className="flex justify-center my-6"><span className="px-3 py-1 rounded-full bg-muted/50 text-[10px] text-muted-foreground font-bold uppercase tracking-widest border border-border/30">{format(msgDate, 'MMMM d, yyyy')}</span></div>
              )}
              <div className={cn("flex items-end gap-2 group", isMe ? "flex-row-reverse" : "flex-row")}>
                {!isMe && (
                  <Avatar className="h-7 w-7 md:h-8 md:h-8 shrink-0 border border-border/50">
                    <AvatarImage src={senderProfile?.profilePictureUrl} /><AvatarFallback className="text-[10px]">{senderProfile?.username?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[85%] md:max-w-[75%] px-3 py-2.5 md:px-4 md:py-3 rounded-2xl text-xs md:text-sm shadow-md transition-all relative", isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card border border-border/50 text-foreground rounded-bl-none", msg.isDeleted && "opacity-40 italic")}>
                  {!isMe && room?.isGroupChat && <p className="text-[10px] font-bold text-accent mb-1 opacity-80 uppercase tracking-tighter">{senderProfile?.username || `User ${msg.senderId.slice(0, 4)}`}</p>}
                  {repliedMsg && (
                    <div className={cn("mb-2 p-2 rounded-lg text-[10px] md:text-xs border-l-4 opacity-70 flex flex-col gap-0.5", isMe ? "bg-primary-foreground/10 border-primary-foreground/50" : "bg-muted border-accent")}>
                      <div className="flex items-center gap-1 font-bold text-[9px] md:text-[10px] uppercase tracking-tighter"><CornerDownRight className="h-3 w-3" />{repliedSender?.id === user?.uid ? "You" : repliedSender?.username || "User"}</div>
                      <p className="truncate italic">{repliedMsg.isDeleted ? "Deleted" : repliedMsg.content}</p>
                    </div>
                  )}
                  {msg.type === 'image' && msg.fileUrl ? (
                    <img src={msg.fileUrl} alt="shared" className="rounded-lg mb-2 max-h-60 w-full object-cover border border-border/20 shadow-sm" />
                  ) : (
                    editingMessageId === msg.id ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="bg-primary-foreground/10 border-none text-white h-8 text-xs" autoFocus />
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingMessageId(null)}><X className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { if (!conversationId || !db) return; updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId, 'messages', msg.id), { content: editValue, updatedAt: serverTimestamp(), isEdited: true }); setEditingMessageId(null); }}><Check className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )
                  )}
                  <div className={cn("flex items-center justify-end gap-1.5 mt-1 text-[8px] md:text-[9px] font-medium opacity-70", isMe ? "text-primary-foreground/90" : "text-muted-foreground")}>
                    {msg.isEdited && !msg.isDeleted && <span>Edited • </span>}
                    <span>{format(msgDate, 'HH:mm')}</span>
                    {isMe && <CheckCheck className={cn("h-3 w-3", msg.readBy?.length > 1 ? "text-accent" : "")} />}
                  </div>
                  {!msg.isDeleted && (
                    <div className={cn("absolute top-0 hidden md:flex transition-opacity opacity-0 group-hover:opacity-100 gap-0.5", isMe ? "-left-24" : "-right-24")}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50" onClick={() => setReplyToMessage(msg)}><Reply className="h-4 w-4" /></Button>
                      <Popover>
                        <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50"><Smile className="h-4 w-4" /></Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-1 rounded-full flex gap-1 border-border">
                          {EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => { if (!conversationId || !db || !user) return; updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId, 'messages', msg.id), { reactions: arrayUnion(`${user.uid}:${emoji}`) }); }} className="hover:scale-125 transition-transform p-1 text-lg">{emoji}</button>
                          ))}
                        </PopoverContent>
                      </Popover>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isMe && (
                            <>
                              <DropdownMenuItem onClick={() => { setEditingMessageId(msg.id); setEditValue(msg.content); }}><Pencil className="h-3 w-3 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { if (!conversationId || !db) return; updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId, 'messages', msg.id), { isDeleted: true, content: "Deleted", updatedAt: serverTimestamp() }); }}><Trash2 className="h-3 w-3 mr-2" /> Delete</DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(msg.content); toast({ title: "Copied" }); }}>Copy</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  {/* Mobile Tap actions could be added here if needed, keeping it clean for now */}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 md:p-4 border-t border-border bg-background/95 backdrop-blur-md">
        {replyToMessage && (
          <div className="max-w-5xl mx-auto mb-3 p-3 bg-muted/50 rounded-xl border border-border/50 flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex flex-col gap-0.5 border-l-4 border-primary pl-3 overflow-hidden">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Replying to {participantMap[replyToMessage.senderId]?.username || "User"}</span>
              <p className="text-xs text-muted-foreground truncate">{replyToMessage.content}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={() => setReplyToMessage(null)}><X className="h-4 w-4" /></Button>
          </div>
        )}
        <div className="flex items-center gap-2 md:gap-3 max-w-5xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-10 w-10 rounded-full text-muted-foreground hover:text-accent transition-colors shrink-0">
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
          </Button>
          <input type="file" min-width="0" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setIsUploading(true); const reader = new FileReader(); reader.onloadend = () => { handleSend('image', reader.result as string); setIsUploading(false); }; reader.readAsDataURL(file); }} />
          <Input value={inputValue} onChange={(e) => { setInputValue(e.target.value); if (!db || !conversationId || !user) return; const typingRef = doc(db, 'chatRooms', conversationId); updateDocumentNonBlocking(typingRef, { [`typing.${user.uid}`]: serverTimestamp() }); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = setTimeout(() => { updateDocumentNonBlocking(typingRef, { [`typing.${user.uid}`]: deleteField() }); }, 3000); }} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Start typing..." className="bg-muted/40 border-none h-11 md:h-12 focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl flex-1 min-w-0" />
          <Button onClick={() => handleSend()} disabled={!inputValue.trim() || isUploading} className="rounded-2xl h-11 md:h-12 px-4 md:px-6 bg-primary hover:bg-primary/90 shadow-lg font-bold shrink-0">
            <Send className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
