
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  MessageSquare, 
  ChevronLeft, 
  Image as ImageIcon, 
  Smile, 
  MoreHorizontal, 
  Loader2, 
  Reply, 
  Edit2, 
  Trash2, 
  X, 
  Check,
  UserMinus,
  LogOut,
  Pin,
  PinOff,
  Camera
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger, 
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { format, isSameDay, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCollection, useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  where, 
  limitToLast,
  deleteDoc,
  deleteField
} from 'firebase/firestore';
import { 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking
} from '@/firebase/non-blocking-updates';
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
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [messageLimit] = useState(50);
  const [isUploading, setIsUploading] = useState(false);
  const [isGroupImageUploading, setIsGroupImageUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupImageInputRef = useRef<HTMLInputElement>(null);
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

  // Handle typing status
  const updateTypingStatus = (isTyping: boolean) => {
    if (!roomRef || !user) return;
    updateDocumentNonBlocking(roomRef, {
      [`typing.${user.uid}`]: isTyping ? serverTimestamp() : deleteField()
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    if (!user) return;

    // Reset typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Only update if not already marked as typing recently (to save writes)
    updateTypingStatus(true);

    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000);
  };

  const handleSend = (type: 'text' | 'image' = 'text', content?: string) => {
    const finalContent = content || inputValue.trim();
    if (!finalContent || !conversationId || !user || !room) return;
    
    // Clear typing status on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateTypingStatus(false);

    if (editingMessage) {
      const msgRef = doc(db, 'chatRooms', conversationId, 'messages', editingMessage.id);
      updateDocumentNonBlocking(msgRef, {
        content: finalContent,
        updatedAt: serverTimestamp(),
        isEdited: true
      });
      setEditingMessage(null);
      setInputValue('');
      return;
    }

    const messageData: any = {
      chatRoomId: conversationId,
      senderId: user.uid,
      content: finalContent,
      type: type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
      isDeleted: false,
      isEdited: false,
    };

    if (replyingTo) {
      messageData.replyToId = replyingTo.id;
      messageData.replyToContent = replyingTo.type === 'image' ? 'Image' : replyingTo.content;
      setReplyingTo(null);
    }

    addDocumentNonBlocking(collection(db, 'chatRooms', conversationId, 'messages'), messageData);
    updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId), {
      lastMessageText: type === 'image' ? 'Sent a photo' : finalContent,
      lastMessageSenderId: user.uid,
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
    });
    
    if (type === 'text') setInputValue('');
  };

  const handleAction = (action: 'delete' | 'edit' | 'reply', message: any) => {
    if (action === 'delete') {
      const msgRef = doc(db, 'chatRooms', conversationId!, 'messages', message.id);
      updateDocumentNonBlocking(msgRef, {
        content: 'This message was deleted',
        isDeleted: true,
        type: 'text',
        fileUrl: null,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Message Deleted" });
    } else if (action === 'edit') {
      setEditingMessage(message);
      setInputValue(message.content);
      setReplyingTo(null);
    } else if (action === 'reply') {
      setReplyingTo(message);
      setEditingMessage(null);
    }
  };

  const handleReact = (message: any, emoji: string) => {
    if (!user || !conversationId) return;
    const msgRef = doc(db, 'chatRooms', conversationId, 'messages', message.id);
    const reactions = message.reactions || {};
    const userReactions = reactions[emoji] || [];
    
    let nextReactions;
    if (userReactions.includes(user.uid)) {
      nextReactions = userReactions.filter((id: string) => id !== user.uid);
    } else {
      nextReactions = [...userReactions, user.uid];
    }

    updateDocumentNonBlocking(msgRef, {
      [`reactions.${emoji}`]: nextReactions
    });
  };

  const handleTogglePin = () => {
    if (!room || !user || !roomRef) return;
    const isPinned = room.pinnedBy?.[user.uid] === true;
    updateDocumentNonBlocking(roomRef, {
      [`pinnedBy.${user.uid}`]: !isPinned
    });
    toast({
      title: !isPinned ? "Conversation Pinned" : "Conversation Unpinned",
      description: !isPinned ? "This chat will stay at the top." : "Chat removed from top."
    });
  };

  const handleDeleteConversation = async () => {
    if (!conversationId || !room) return;
    try {
      if (room.isGroupChat) {
        const nextMembers = { ...room.members };
        delete nextMembers[user!.uid];
        const nextMemberIds = room.memberIds.filter((id: string) => id !== user!.uid);
        updateDocumentNonBlocking(roomRef!, {
          members: nextMembers,
          memberIds: nextMemberIds
        });
      } else {
        await deleteDoc(roomRef!);
      }
      onBack?.();
      toast({ title: room.isGroupChat ? "Left Group" : "Conversation Deleted" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not perform action." });
    }
  };

  const handleRemoveMember = (memberId: string) => {
    if (!room || !roomRef) return;
    const nextMembers = { ...room.members };
    delete nextMembers[memberId];
    const nextMemberIds = room.memberIds.filter((id: string) => id !== memberId);
    updateDocumentNonBlocking(roomRef, {
      members: nextMembers,
      memberIds: nextMemberIds
    });
    toast({ title: "Member Removed" });
  };

  const handleGroupImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomRef) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Image must be under 5MB." });
      return;
    }

    setIsGroupImageUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      updateDocumentNonBlocking(roomRef, { groupImageUrl: reader.result as string });
      setIsGroupImageUploading(false);
      toast({ title: "Group Photo Updated" });
    };
    reader.onerror = () => {
      setIsGroupImageUploading(false);
      toast({ variant: "destructive", title: "Upload Failed" });
    };
    reader.readAsDataURL(file);
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

  const otherUserProfile = React.useMemo(() => {
    if (!room || room.isGroupChat || !participants || !user) return null;
    return participants.find(p => p.id !== user.uid);
  }, [room, participants, user]);

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
    if (room.isGroupChat) return room.groupImageUrl;
    if (participants && user) {
      const otherUser = participants.find(p => p.id !== user.uid);
      return otherUser?.profilePictureUrl;
    }
    return null;
  }, [room, participants, user]);

  const typingUsers = React.useMemo(() => {
    if (!room?.typing || !participants || !user) return [];
    return Object.keys(room.typing)
      .filter(id => id !== user.uid)
      .map(id => participants.find(p => p.id === id)?.username)
      .filter(Boolean);
  }, [room?.typing, participants, user]);

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
      
      <header className="h-16 md:h-20 px-4 md:px-6 flex items-center justify-between glass-morphism sticky top-0 z-10 mx-2 mt-2 md:mx-4 md:mt-4 rounded-xl md:rounded-2xl shadow-lg border-white/5">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8 md:h-10 md:w-10 border border-white/10">
              <AvatarImage src={chatAvatar || undefined} className="object-cover" />
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs md:text-sm">{chatDisplayName?.[0]}</AvatarFallback>
            </Avatar>
            {!room?.isGroupChat && otherUserProfile?.onlineStatus && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-accent border-2 border-background" />
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2">
              <h3 className="text-xs md:text-sm font-bold leading-none truncate">{chatDisplayName}</h3>
              {!room?.isGroupChat && otherUserProfile?.onlineStatus && (
                <span className="text-[8px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider hidden sm:inline-block">Online</span>
              )}
            </div>
            <span className="text-[9px] md:text-[10px] text-muted-foreground truncate mt-0.5 md:mt-1 font-medium italic">
              {typingUsers.length > 0 
                ? `${typingUsers.join(', ')} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`
                : (room?.isGroupChat ? "Group Conversation" : (otherUserProfile?.bio || 'No bio available'))}
            </span>
          </div>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5 shrink-0">
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card/95 backdrop-blur-xl border-white/10 w-full sm:max-w-md flex flex-col">
            <SheetHeader className="pb-8">
              <SheetTitle>Conversation Settings</SheetTitle>
              <SheetDescription>Personalize your chat experience.</SheetDescription>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto space-y-8 pr-2 scrollbar-hide">
              {room?.isGroupChat && (
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary">Group Identity</Label>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="relative group">
                      <Avatar className="h-16 w-16 border-2 border-white/10 shadow-lg">
                        <AvatarImage src={room.groupImageUrl} className="object-cover" />
                        <AvatarFallback className="text-xl">{room.name?.[0]}</AvatarFallback>
                      </Avatar>
                      {room.createdBy === user?.uid && (
                        <button 
                          onClick={() => groupImageInputRef.current?.click()}
                          disabled={isGroupImageUploading}
                          className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        >
                          {isGroupImageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        </button>
                      )}
                      <input type="file" ref={groupImageInputRef} className="hidden" accept="image/*" onChange={handleGroupImageUpload} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{room.name}</h4>
                      <p className="text-[10px] text-muted-foreground">Click photo to update group profile.</p>
                    </div>
                  </div>
                </div>
              )}

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

              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-primary">Conversation Members</Label>
                <div className="space-y-2">
                  {participants?.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profilePictureUrl} />
                          <AvatarFallback>{member.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{member.username}</span>
                          {member.onlineStatus && <span className="text-[8px] text-accent font-bold uppercase">Online</span>}
                        </div>
                      </div>
                      {room?.isGroupChat && room.createdBy === user?.uid && member.id !== user?.uid && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <SheetFooter className="pt-8 border-t border-white/5 flex flex-col gap-2">
              <Button 
                variant="outline" 
                className="w-full gap-2 rounded-xl"
                onClick={handleTogglePin}
              >
                {room?.pinnedBy?.[user?.uid || ''] ? (
                  <><PinOff className="h-4 w-4" /> Unpin Chat</>
                ) : (
                  <><Pin className="h-4 w-4" /> Pin Chat</>
                )}
              </Button>
              <Button 
                variant="destructive" 
                className="w-full gap-2 rounded-xl"
                onClick={handleDeleteConversation}
              >
                {room?.isGroupChat ? <LogOut className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                {room?.isGroupChat ? "Leave Group" : "Delete Conversation"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 md:py-8 space-y-2 scrollbar-hide z-[1]">
        {messages?.map((msg, idx) => {
          const isMe = msg.senderId === user?.uid;
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const sender = participants?.find(p => p.id === msg.senderId);
          const hasReactions = msg.reactions && Object.values(msg.reactions).some((uids: any) => uids.length > 0);
          
          // Grouping logic: Same sender, same day, and within 5 minutes
          const isGrouped = prevMsg && 
            prevMsg.senderId === msg.senderId && 
            msg.createdAt && prevMsg.createdAt &&
            isSameDay(msg.createdAt.toDate(), prevMsg.createdAt.toDate()) &&
            differenceInMinutes(msg.createdAt.toDate(), prevMsg.createdAt.toDate()) < 5 &&
            !msg.replyToId; // Don't group if it's a reply

          return (
            <div key={msg.id} className={cn(
              "flex flex-col animate-in-fade", 
              isMe ? "items-end" : "items-start",
              !isGrouped && "mt-4"
            )}>
              {!isMe && room?.isGroupChat && !isGrouped && (
                <span className="text-[10px] font-bold text-muted-foreground/60 ml-2 mb-1 uppercase tracking-widest">
                  {sender?.username}
                </span>
              )}

              {msg.replyToId && (
                <div className={cn(
                  "px-3 py-1 mb-[-4px] rounded-t-xl bg-white/5 border-l-2 border-primary text-[10px] text-muted-foreground/80 max-w-[80%] md:max-w-[60%] truncate",
                  isMe ? "mr-2" : "ml-2"
                )}>
                  <Reply className="h-3 w-3 inline mr-1 opacity-50" />
                  {msg.replyToContent}
                </div>
              )}

              <div className={cn(
                "group relative flex items-center gap-2 max-w-[90%] md:max-w-[85%]",
                hasReactions && "mb-4"
              )}>
                {isMe && (
                  <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleAction('reply', msg)}>
                      <Reply className="h-3 w-3" />
                    </Button>
                    {!msg.isDeleted && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleAction('edit', msg)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => handleAction('delete', msg)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                )}

                <div className={cn(
                  "rounded-2xl text-[13px] leading-relaxed shadow-lg transition-transform relative",
                  isMe 
                    ? "bg-primary text-primary-foreground rounded-br-none message-shadow-me" 
                    : "bg-white/[0.05] backdrop-blur-md border border-white/5 text-foreground rounded-bl-none message-shadow",
                  msg.type === 'image' ? 'p-1' : 'p-3 md:p-4',
                  msg.isDeleted && "italic opacity-50",
                  isGrouped && (isMe ? "rounded-tr-none" : "rounded-tl-none")
                )}>
                  {msg.type === 'image' ? (
                    <img src={msg.content} alt="Shared" className="rounded-xl max-w-full h-auto object-cover max-h-64 md:max-h-96" />
                  ) : (
                    msg.content
                  )}
                  {msg.isEdited && !msg.isDeleted && (
                    <span className="block text-[8px] opacity-40 mt-1 text-right">edited</span>
                  )}
                  
                  {hasReactions && (
                    <div className={cn(
                      "absolute -bottom-3 flex flex-wrap gap-1 z-10",
                      isMe ? "right-0" : "left-0"
                    )}>
                      {Object.entries(msg.reactions).map(([emoji, uids]: [string, any]) => uids.length > 0 && (
                        <button 
                          key={emoji}
                          onClick={() => handleReact(msg, emoji)}
                          className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] glass-morphism-heavy shadow-xl border border-white/10",
                            uids.includes(user?.uid) ? "border-primary/40 bg-primary/20" : "border-white/5"
                          )}
                        >
                          {emoji} <span className="font-bold">{uids.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!isMe && (
                  <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleAction('reply', msg)}>
                      <Reply className="h-3 w-3" />
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <Smile className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-1 bg-card/90 backdrop-blur-xl border-white/10 rounded-full">
                        <div className="flex gap-1">
                          {REACTION_EMOJIS.map(emoji => (
                            <button 
                              key={emoji} 
                              className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-lg"
                              onClick={() => handleReact(msg, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {!isGrouped && (
                <div className="mt-1 px-1 flex items-center gap-1.5">
                  <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">
                    {msg.createdAt && format(msg.createdAt.toDate(), 'HH:mm')}
                  </span>
                  {isMe && <div className="h-1 w-1 rounded-full bg-accent" />}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 md:p-6 bg-transparent z-10 space-y-3">
        {replyingTo && (
          <div className="max-w-4xl mx-auto flex items-center justify-between glass-morphism-heavy px-4 py-2 rounded-xl animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <Reply className="h-4 w-4 text-primary shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] font-bold text-primary block uppercase">Replying to</span>
                <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setReplyingTo(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {editingMessage && (
          <div className="max-w-4xl mx-auto flex items-center justify-between glass-morphism-heavy px-4 py-2 rounded-xl border-accent/20 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <Edit2 className="h-4 w-4 text-accent shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] font-bold text-accent block uppercase">Editing message</span>
                <p className="text-xs text-muted-foreground truncate">{editingMessage.content}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setEditingMessage(null); setInputValue(''); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="max-w-4xl mx-auto flex items-end gap-2 md:gap-3 glass-morphism p-2 md:p-3 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border-white/5">
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
            className="h-9 w-9 md:h-10 md:w-10 rounded-full hover:bg-white/10 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <ImageIcon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />}
          </Button>
          <div className="flex-1">
            <Input 
              value={inputValue} 
              onChange={handleInputChange} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
              placeholder={editingMessage ? "Update message..." : "Message kith..."} 
              className="bg-transparent border-none h-9 md:h-10 px-2 md:px-4 focus-visible:ring-0 text-sm placeholder:text-muted-foreground/40" 
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 rounded-full hover:bg-white/10 hidden sm:flex">
                  <Smile className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 bg-card/90 backdrop-blur-xl border-white/10 rounded-2xl mb-4">
                <div className="grid grid-cols-4 gap-2">
                  {COMMON_EMOJIS.map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={() => setInputValue(prev => prev + emoji)}
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
                "h-9 w-9 md:h-10 md:w-10 rounded-full transition-all active:scale-90",
                inputValue.trim() ? (editingMessage ? "bg-accent" : "bg-primary") + " text-white" : "bg-muted/20 text-muted-foreground"
              )}
            >
              {editingMessage ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
