
"use client";

import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
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
  Camera,
  AtSign,
  Phone,
  Video
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

const MessageItem = memo(({ 
  msg, 
  isMe, 
  isGrouped, 
  sender, 
  isGroupChat, 
  onAction, 
  onReact, 
  currentUserId 
}: any) => {
  const reactions = msg.reactions || {};
  const hasReactions = Object.values(reactions).some((uids: any) => uids.length > 0);

  const renderMarkdown = (content: string) => {
    if (!content) return null;
    
    const parts = content.split(/(@\w+)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={`mention-${i}`} className="mention">{part}</span>;
      }

      let formattedText: React.ReactNode[] = [part];

      formattedText = formattedText.flatMap((item, idx) => {
        if (typeof item !== 'string') return item;
        return item.split(/`([^`]+)`/g).map((sub, si) => 
          si % 2 === 1 ? <code key={`code-${idx}-${si}`}>{sub}</code> : sub
        );
      });

      formattedText = formattedText.flatMap((item, idx) => {
        if (typeof item !== 'string') return item;
        return item.split(/\*\*([^\*\*]+)\*\*/g).map((sub, si) => 
          si % 2 === 1 ? <strong key={`bold-${idx}-${si}`}>{sub}</strong> : sub
        );
      });

      formattedText = formattedText.flatMap((item, idx) => {
        if (typeof item !== 'string') return item;
        return item.split(/\*([^\*]+)\*/g).map((sub, si) => 
          si % 2 === 1 ? <em key={`italic-${idx}-${si}`}>{sub}</em> : sub
        );
      });

      return <React.Fragment key={`part-${i}`}>{formattedText}</React.Fragment>;
    });
  };

  return (
    <div className={cn(
      "flex flex-col animate-in-fade", 
      isMe ? "items-end" : "items-start",
      !isGrouped && "mt-4",
      hasReactions && "mb-5"
    )}>
      {!isMe && isGroupChat && !isGrouped && (
        <span className="text-[10px] font-bold text-muted-foreground/60 ml-2 mb-1 uppercase tracking-widest">
          {sender?.username}
        </span>
      )}

      {msg.replyToId && (
        <div className={cn(
          "px-3 py-1 mb-[-4px] rounded-t-xl bg-black/5 dark:bg-white/5 border-l-2 border-primary text-[10px] text-muted-foreground/80 max-w-[80%] md:max-w-[60%] truncate",
          isMe ? "mr-2" : "ml-2"
        )}>
          <Reply className="h-3 w-3 inline mr-1 opacity-50" />
          {msg.replyToContent}
        </div>
      )}

      <div className={cn(
        "group relative flex items-center gap-2 max-w-[90%] md:max-w-[85%]"
      )}>
        {isMe && (
          <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onAction('reply', msg)}>
              <Reply className="h-3 w-3" />
            </Button>
            {!msg.isDeleted && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onAction('edit', msg)}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => onAction('delete', msg)}>
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
            : "bg-black/[0.05] dark:bg-white/[0.05] backdrop-blur-md border border-black/5 dark:border-white/5 text-foreground rounded-bl-none message-shadow",
          msg.type === 'image' ? 'p-1' : 'p-3 md:p-4',
          msg.isDeleted && "italic opacity-50",
          isGrouped && (isMe ? "rounded-tr-none" : "rounded-tl-none")
        )}>
          {msg.type === 'image' ? (
            <img src={msg.content} alt="Shared" className="rounded-xl max-w-full h-auto object-cover max-h-64 md:max-h-96" />
          ) : (
            renderMarkdown(msg.content)
          )}
          {msg.isEdited && !msg.isDeleted && (
            <span className="block text-[8px] opacity-40 mt-1 text-right">edited</span>
          )}
          
          {hasReactions && (
            <div className={cn(
              "absolute -bottom-4 flex flex-wrap gap-1 z-10",
              isMe ? "right-0" : "left-0"
            )}>
              {Object.entries(reactions).map(([emoji, uids]: [string, any]) => uids.length > 0 && (
                <button 
                  key={emoji}
                  onClick={() => onReact(msg, emoji)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] glass-morphism-heavy shadow-2xl border transition-all active:scale-90",
                    uids.includes(currentUserId) 
                      ? "border-primary/50 bg-primary/20 text-primary shadow-primary/20" 
                      : "border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-bold opacity-80">{uids.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!isMe && (
          <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onAction('reply', msg)}>
              <Reply className="h-3 w-3" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Smile className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1 bg-card/90 backdrop-blur-xl border-black/5 dark:border-white/10 rounded-full">
                <div className="flex gap-1">
                  {REACTION_EMOJIS.map(emoji => (
                    <button 
                      key={emoji} 
                      className={cn(
                        "h-8 w-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-lg",
                        (reactions[emoji] || []).includes(currentUserId) && "bg-primary/20"
                      )}
                      onClick={() => onReact(msg, emoji)}
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
});
MessageItem.displayName = 'MessageItem';

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [messageLimit] = useState(50);
  const [isUploading, setIsUploading] = useState(false);
  const [isGroupImageUploading, setIsGroupImageUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  
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
    return query(collection(db, 'users'), where('id', 'in', room.memberIds.slice(0, 30)));
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

  const updateTypingStatus = (isTyping: boolean) => {
    if (!roomRef || !user) return;
    updateDocumentNonBlocking(roomRef, {
      [`typing.${user.uid}`]: isTyping ? serverTimestamp() : deleteField()
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    if (!user) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateTypingStatus(true);

    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000);

    const lastAtPos = val.lastIndexOf('@');
    if (lastAtPos !== -1 && room?.isGroupChat) {
      const textAfterAt = val.substring(lastAtPos + 1);
      if (!textAfterAt.includes(' ')) {
        setShowMentions(true);
        setMentionFilter(textAfterAt.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (username: string) => {
    const lastAtPos = inputValue.lastIndexOf('@');
    const newVal = inputValue.substring(0, lastAtPos) + '@' + username + ' ';
    setInputValue(newVal);
    setShowMentions(false);
  };

  const handleSend = (type: 'text' | 'image' = 'text', content?: string) => {
    const finalContent = content || inputValue.trim();
    if (!finalContent || !conversationId || !user || !room) return;
    
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
    const reactions = { ...(message.reactions || {}) };
    const hadThisEmoji = (reactions[emoji] || []).includes(user.uid);

    Object.keys(reactions).forEach(e => {
      reactions[e] = (reactions[e] || []).filter((uid: string) => uid !== user.uid);
      if (reactions[e].length === 0) delete reactions[e];
    });

    if (!hadThisEmoji) {
      if (!reactions[emoji]) reactions[emoji] = [];
      reactions[emoji].push(user.uid);
    }

    updateDocumentNonBlocking(msgRef, { reactions });
  };

  const handleTogglePin = () => {
    if (!room || !user || !roomRef) return;
    const uid = user.uid;
    const isPinned = room.pinnedBy?.[uid] === true;
    updateDocumentNonBlocking(roomRef, {
      [`pinnedBy.${uid}`]: !isPinned
    });
    toast({
      title: !isPinned ? "Conversation Pinned" : "Conversation Unpinned",
    });
  };

  const handleDeleteConversation = async () => {
    if (!conversationId || !room || !user) return;
    try {
      if (room.isGroupChat) {
        const nextMembers = { ...room.members };
        delete nextMembers[user.uid];
        const nextMemberIds = (room.memberIds || []).filter((id: string) => id !== user.uid);
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
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const handleGroupImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomRef) return;
    if (file.size > 600 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Limit is 600KB for stability." });
      return;
    }
    setIsGroupImageUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      updateDocumentNonBlocking(roomRef, { groupImageUrl: reader.result as string });
      setIsGroupImageUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 600 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Limit is 600KB for stability." });
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      handleSend('image', reader.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleStartCall = (type: 'audio' | 'video') => {
    if (!user || !db || !conversationId || room?.isGroupChat) {
      toast({ title: "Group calls not supported yet." });
      return;
    }
    const otherUserId = room.memberIds?.find((id: string) => id !== user.uid);
    if (!otherUserId) return;

    addDocumentNonBlocking(collection(db, 'calls'), {
      callerId: user.uid,
      receiverId: otherUserId,
      callerName: user.displayName || 'Kith User',
      status: 'ringing',
      type: type,
      createdAt: serverTimestamp(),
    });
  };

  const otherUserProfile = useMemo(() => {
    if (!room || room.isGroupChat || !participants || !user) return null;
    return participants.find(p => p.id !== user.uid);
  }, [room, participants, user]);

  const chatDisplayName = useMemo(() => {
    if (!room) return 'Loading...';
    if (!room.isGroupChat && participants && user) {
      const otherUser = participants.find(p => p.id !== user.uid);
      if (otherUser) return otherUser.username;
    }
    return room.name || 'Conversation';
  }, [room, participants, user]);

  const chatAvatar = useMemo(() => {
    if (!room) return null;
    if (room.isGroupChat) return room.groupImageUrl;
    if (participants && user) {
      const otherUser = participants.find(p => p.id !== user.uid);
      return otherUser?.profilePictureUrl;
    }
    return null;
  }, [room, participants, user]);

  const typingUsers = useMemo(() => {
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
            <h3 className="text-xs md:text-sm font-bold leading-none truncate">{chatDisplayName}</h3>
            <span className="text-[9px] md:text-[10px] text-muted-foreground truncate mt-0.5 md:mt-1 font-medium italic">
              {typingUsers.length > 0 
                ? `${typingUsers.join(', ')} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`
                : (room?.isGroupChat ? "Group Conversation" : (otherUserProfile?.bio || 'No bio available'))}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          {!room?.isGroupChat && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-full" onClick={() => handleStartCall('audio')}>
                <Phone className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-full" onClick={() => handleStartCall('video')}>
                <Video className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              </Button>
            </>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 dark:hover:bg-white/5 shrink-0">
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-card/95 backdrop-blur-xl border-black/5 dark:border-white/10 w-full sm:max-w-md flex flex-col">
              <SheetHeader className="pb-8">
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-8 pr-2 scrollbar-hide">
                {room?.isGroupChat && (
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-widest text-primary">Group Identity</Label>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-black/5 dark:bg-white/5">
                      <div className="relative group">
                        <Avatar className="h-16 w-16 shadow-lg">
                          <AvatarImage src={room.groupImageUrl} className="object-cover" />
                          <AvatarFallback className="text-xl">{room.name?.[0]}</AvatarFallback>
                        </Avatar>
                        {room.createdBy === user?.uid && (
                          <button onClick={() => groupImageInputRef.current?.click()} className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center">
                            <Camera className="h-4 w-4" />
                          </button>
                        )}
                        <input type="file" ref={groupImageInputRef} className="hidden" accept="image/*" onChange={handleGroupImageUpload} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary">Wallpapers</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {WALLPAPERS.map(wp => (
                      <button key={wp.id} onClick={() => roomRef && updateDocumentNonBlocking(roomRef, { wallpaper: wp.value })} className={cn("h-20 rounded-xl overflow-hidden border-2", room?.wallpaper === wp.value ? "border-primary" : "border-black/5")}>
                        <div className={cn("h-full w-full", wp.preview)} style={{ background: wp.value }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <SheetFooter className="pt-8 flex flex-col gap-2">
                <Button variant="outline" className="w-full rounded-xl" onClick={handleTogglePin}>
                  {room?.pinnedBy?.[user?.uid || ''] ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                  {room?.pinnedBy?.[user?.uid || ''] ? 'Unpin' : 'Pin'}
                </Button>
                <Button variant="destructive" className="w-full rounded-xl" onClick={handleDeleteConversation}>
                  {room?.isGroupChat ? <LogOut className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  {room?.isGroupChat ? "Leave Group" : "Delete Conversation"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 md:py-8 space-y-2 scrollbar-hide z-[1]">
        {messages?.map((msg, idx) => {
          const isMe = msg.senderId === user?.uid;
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const isGrouped = prevMsg && 
            prevMsg.senderId === msg.senderId && 
            msg.createdAt && prevMsg.createdAt &&
            isSameDay(msg.createdAt.toDate(), prevMsg.createdAt.toDate()) &&
            differenceInMinutes(msg.createdAt.toDate(), prevMsg.createdAt.toDate()) < 5 &&
            !msg.replyToId;

          return (
            <MessageItem 
              key={msg.id}
              msg={msg}
              isMe={isMe}
              isGrouped={isGrouped}
              sender={participants?.find(p => p.id === msg.senderId)}
              isGroupChat={room?.isGroupChat}
              onAction={handleAction}
              onReact={handleReact}
              currentUserId={user?.uid}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 md:p-6 bg-transparent z-10 space-y-3">
        {showMentions && participants && (
          <div className="max-w-4xl mx-auto glass-morphism-heavy rounded-2xl p-2 mb-2 shadow-2xl">
            <div className="max-h-40 overflow-y-auto scrollbar-hide">
              {participants.filter(p => p.username.toLowerCase().includes(mentionFilter) && p.id !== user?.uid).map(p => (
                <button key={p.id} onClick={() => insertMention(p.username)} className="w-full flex items-center gap-3 p-2 hover:bg-primary/10 rounded-xl">
                  <Avatar className="h-8 w-8"><AvatarImage src={p.profilePictureUrl} /><AvatarFallback>{p.username[0]}</AvatarFallback></Avatar>
                  <span className="text-sm font-bold">{p.username}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="max-w-4xl mx-auto flex items-end gap-2 glass-morphism p-2 rounded-[1.5rem] shadow-2xl">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => fileInputRef.current?.click()}>
            {isUploading ? <Loader2 className="animate-spin" /> : <ImageIcon />}
          </Button>
          <Input 
            value={inputValue} 
            onChange={handleInputChange} 
            onKeyDown={(e) => e.key === 'Enter' && !showMentions && handleSend()} 
            placeholder="Message kith..." 
            className="bg-transparent border-none h-10 px-2 focus-visible:ring-0" 
          />
          <Button onClick={() => handleSend()} disabled={!inputValue.trim() || isUploading} className={cn("h-10 w-10 rounded-full", inputValue.trim() ? "bg-primary" : "bg-muted/20")}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
