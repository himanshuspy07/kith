
"use client";

import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { 
  ChevronLeft, 
  MoreHorizontal, 
  Reply, 
  Edit2, 
  Trash2, 
  X, 
  Camera,
  Info,
  Check,
  CheckCheck,
  Eye,
  EyeOff,
  Clock,
  MessageSquare,
  SmilePlus,
  Palette,
  Upload,
  AlertCircle,
  Pin,
  PinOff
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger, 
} from '@/components/ui/sheet';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
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
  deleteField,
  arrayUnion,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import wallpaperData from '@/app/lib/placeholder-images.json';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface ChatWindowProps {
  conversationId?: string;
  onBack?: () => void;
}

const MessageItem = memo(({ 
  msg, 
  isMe, 
  sender, 
  onAction, 
  onReact, 
  onImageClick,
  currentUserId,
  otherUserLastRead,
  hasWallpaper,
  showAvatar
}: any) => {
  if (msg.type === 'screenshot-attempt') {
    return (
      <div className="flex justify-center my-4 animate-in-fade w-full">
        <div className={cn(
          "flex items-center gap-2 px-4 py-1.5 rounded-full border bg-destructive/5 border-destructive/20 text-destructive text-[10px] font-black uppercase tracking-[0.2em] shadow-sm",
          hasWallpaper && "bg-black/60 border-white/20 text-white"
        )}>
          <AlertCircle className="h-3 w-3" />
          {isMe ? "You tried to take a screenshot" : `${sender?.username || 'User'} tried to take a screenshot`}
        </div>
      </div>
    );
  }

  const isReadByOthers = useMemo(() => {
    if (!isMe || !otherUserLastRead || !msg.createdAt) return false;
    try {
      const msgTime = msg.createdAt.toMillis ? msg.createdAt.toMillis() : Date.now();
      const readTime = otherUserLastRead.toMillis ? otherUserLastRead.toMillis() : 0;
      return readTime >= msgTime;
    } catch (e) {
      return false;
    }
  }, [isMe, otherUserLastRead, msg.createdAt]);

  const isViewOnce = msg.type === 'view-once';
  const isOpened = isViewOnce && msg.openedBy && msg.openedBy.includes(currentUserId);
  const timeStr = msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : '';

  const reactions = msg.reactions || {};
  const reactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(reactions).forEach((emoji: any) => {
      counts[emoji] = (counts[emoji] || 0) + 1;
    });
    return Object.entries(counts);
  }, [reactions]);

  const myReaction = reactions[currentUserId];

  return (
    <div className={cn(
      "flex flex-col animate-in-fade px-6 group transition-colors w-full", 
      showAvatar ? "mt-4 mb-1" : "mt-0.5 mb-0.5"
    )}>
      <div className="flex items-start gap-4 max-w-full relative">
        <div className="relative shrink-0">
          {showAvatar ? (
            <Avatar className="h-10 w-10 mt-1">
              <AvatarImage src={sender?.profilePictureUrl} className="object-cover" />
              <AvatarFallback className="bg-muted text-[10px] font-black">{sender?.username?.[0]}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-10" />
          )}
        </div>

        <div className="flex flex-col min-w-0 max-w-[85%] md:max-w-[70%]">
          <div className="flex items-center gap-2">
            {showAvatar && (
              <span className={cn(
                "text-[14px] font-black uppercase tracking-tighter truncate", 
                isMe ? "text-secondary" : "text-primary",
                hasWallpaper && "drop-shadow-md text-white/90"
              )}>
                {isMe ? "ME" : sender?.username}
              </span>
            )}
            <span className={cn(
              "text-[9px] font-black opacity-60 uppercase shrink-0",
              hasWallpaper ? "text-white/70" : "text-muted-foreground",
              !showAvatar && "mt-1"
            )}>{timeStr}</span>
            {msg.isEdited && <span className="text-[8px] text-muted-foreground font-bold uppercase italic opacity-40 shrink-0">Edited</span>}
          </div>

          <div className="relative mt-1">
            {msg.replyTo && (
              <div className={cn(
                "mb-2 p-2 border-l-4 border-primary rounded-r-xl text-[11px] max-w-full opacity-70",
                hasWallpaper ? "bg-black/60 text-white" : "bg-muted/30"
              )}>
                 <p className="font-bold uppercase tracking-widest text-[9px] mb-1">Replying to:</p>
                 <p className="truncate italic">{msg.replyToContent}</p>
              </div>
            )}

            {isViewOnce ? (
              <div 
                onClick={() => !isOpened && onImageClick(msg.content, msg.id, true)}
                className={cn(
                  "flex items-center gap-3 py-2 px-4 rounded-2xl cursor-pointer transition-colors border max-w-full",
                  hasWallpaper ? "bg-black/60 border-white/20 text-white backdrop-blur-sm" : "bg-muted/50 border-border/50"
                )}
              >
                <div className="h-8 w-8 rounded-xl bg-background/20 flex items-center justify-center shadow-sm shrink-0">
                  {isOpened ? <EyeOff className="h-4 w-4 opacity-40" /> : <Eye className="h-4 w-4 text-primary" />}
                </div>
                <span className="text-sm font-black uppercase tracking-widest truncate">{isOpened ? "Snap Opened" : "New Photo"}</span>
              </div>
            ) : msg.type === 'image' ? (
              <div className="relative mt-1 max-w-full">
                <img 
                  src={msg.content} 
                  alt="Shared" 
                  className="rounded-2xl max-w-full h-auto object-cover cursor-zoom-in shadow-xl hover:scale-[1.01] transition-transform border border-border/20" 
                  onClick={() => onImageClick(msg.content)}
                />
              </div>
            ) : (
              <div className="relative max-w-full">
                <p className={cn(
                  "text-[16px] font-medium leading-normal break-words py-1", 
                  msg.isDeleted && "italic opacity-50 line-through",
                  hasWallpaper ? "text-white drop-shadow-md" : "text-foreground"
                )}>
                  {msg.isDeleted ? "Message deleted" : msg.content}
                </p>
              </div>
            )}

            {reactionCounts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {reactionCounts.map(([emoji, count]) => (
                  <button
                    key={emoji}
                    onClick={() => onReact(emoji)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all",
                      myReaction === emoji 
                        ? "bg-primary/10 border-primary/30 text-primary" 
                        : hasWallpaper 
                          ? "bg-black/60 border-white/20 text-white hover:bg-black/80"
                          : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span>{emoji}</span>
                    <span>{count}</span>
                  </button>
                ))}
              </div>
            )}

            {isMe && !msg.isDeleted && (
              <div className="flex items-center gap-1 mt-1.5 opacity-50">
                {isReadByOthers ? <CheckCheck className="h-3 w-3 text-primary" /> : <Check className={cn("h-3 w-3", hasWallpaper && "text-white")} />}
                <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", hasWallpaper ? "text-white" : "text-foreground")}>
                  {isReadByOthers ? "Opened" : "Sent"}
                </span>
              </div>
            )}
          </div>
        </div>

        {!msg.isDeleted && (
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full opacity-0 group-hover:opacity-100 flex items-center gap-2 pl-4 transition-all pointer-events-none group-hover:pointer-events-auto z-10">
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 w-8 rounded-full bg-card shadow-lg flex items-center justify-center hover:text-primary transition-colors border border-border/50">
                  <SmilePlus className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="center" className="w-fit p-1.5 flex gap-1 rounded-full bg-card/95 backdrop-blur shadow-2xl border-border/50">
                {REACTION_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => onReact(emoji)}
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-lg",
                      myReaction === emoji && "bg-primary/20"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            <button onClick={() => onAction('reply', msg)} className="h-8 w-8 rounded-full bg-card shadow-lg flex items-center justify-center hover:text-primary transition-colors border border-border/50">
              <Reply className="h-4 w-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full bg-card shadow-lg flex items-center justify-center hover:text-foreground transition-colors border border-border/50">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-border/50">
                {isMe && !isViewOnce && <DropdownMenuItem onClick={() => onAction('edit', msg)} className="gap-2 font-bold uppercase text-[10px] tracking-widest"><Edit2 className="h-3 w-3" /> Edit</DropdownMenuItem>}
                <DropdownMenuItem onClick={() => onAction('delete', msg)} className="gap-2 font-bold uppercase text-[10px] tracking-widest text-destructive"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';

const DateSeparator = ({ date, hasWallpaper }: { date: Date, hasWallpaper: boolean }) => {
  let label = format(date, 'MMMM d');
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  else if (date.getFullYear() !== new Date().getFullYear()) label = format(date, 'MMMM d, yyyy');

  return (
    <div className="flex justify-center my-6 sticky top-2 z-20 pointer-events-none w-full">
      <div className={cn(
        "px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] border backdrop-blur-md shadow-sm transition-all whitespace-nowrap",
        hasWallpaper 
          ? "bg-black/60 border-white/10 text-white" 
          : "bg-background/80 border-border text-muted-foreground"
      )}>
        {label}
      </div>
    </div>
  );
};

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isViewOnceEnabled, setIsViewOnceEnabled] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<{url: string, id?: string, isViewOnce?: boolean} | null>(null);
  const [messageLimit, setMessageLimit] = useState(25);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isBlurred, setIsBlurred] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const roomRef = useMemoFirebase(() => {
    if (!db || !conversationId) return null;
    return doc(db, 'chatRooms', conversationId);
  }, [db, conversationId]);
  const { data: room } = useDoc(roomRef);

  const currentUserRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: currentUserData } = useDoc(currentUserRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !conversationId) return null;
    return query(
      collection(db, 'chatRooms', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limitToLast(messageLimit)
    );
  }, [db, conversationId, messageLimit]);
  const { data: messages } = useCollection(messagesQuery);

  const participantIds = useMemo(() => {
    if (!room?.memberIds) return [];
    return room.memberIds.slice(0, 30);
  }, [JSON.stringify(room?.memberIds)]);

  const participantsQuery = useMemoFirebase(() => {
    if (!db || participantIds.length === 0) return null;
    return query(collection(db, 'users'), where('id', 'in', participantIds));
  }, [db, JSON.stringify(participantIds)]);
  const { data: participants } = useCollection(participantsQuery);

  useEffect(() => {
    if (!conversationId || !user || !db) return;

    const handleScreenshotAlert = () => {
      handleSend('screenshot-attempt', 'Attempted to take a screenshot');
      toast({
        variant: "destructive",
        title: "Screenshot Restricted",
        description: "Your screenshot attempt has been logged and reported to all participants.",
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' || 
        (e.metaKey && e.shiftKey && (e.key === '4' || e.key === '3')) || 
        (e.ctrlKey && e.key === 'p') 
      ) {
        handleScreenshotAlert();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', () => setIsBlurred(true));
    window.addEventListener('focus', () => setIsBlurred(false));

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', () => setIsBlurred(true));
      window.removeEventListener('focus', () => setIsBlurred(false));
    };
  }, [conversationId, user, db, toast]);

  useEffect(() => {
    if (roomRef && user) {
      updateDocumentNonBlocking(roomRef, {
        readBy: arrayUnion(user.uid),
        [`lastRead.${user.uid}`]: serverTimestamp()
      });
    }
  }, [messages?.length, user?.uid, roomRef]);

  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const currentLastMessage = messages[messages.length - 1];
    const currentLastMessageId = currentLastMessage.id;
    const isNewMessageAtEnd = currentLastMessageId !== lastMessageIdRef.current;
    
    if (isInitialLoad) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      setIsInitialLoad(false);
      lastMessageIdRef.current = currentLastMessageId;
    } else if (isNewMessageAtEnd) {
      const container = scrollContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
        const isFromMe = currentLastMessage.senderId === user?.uid;
        
        if (isNearBottom || isFromMe) {
           messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
      lastMessageIdRef.current = currentLastMessageId;
    }
  }, [messages, isInitialLoad, user?.uid]);

  useEffect(() => {
    if (!topSentinelRef.current || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && messages && messages.length >= messageLimit) {
        const prevScrollHeight = scrollContainerRef.current?.scrollHeight || 0;
        setMessageLimit(prev => prev + 25);
        
        setTimeout(() => {
          if (scrollContainerRef.current) {
            const newScrollHeight = scrollContainerRef.current.scrollHeight;
            scrollContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
          }
        }, 100);
      }
    }, { threshold: 0.1, root: scrollContainerRef.current });

    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [messages, messageLimit]);

  const updateTypingStatus = (isTyping: boolean) => {
    if (!roomRef || !user) return;
    updateDocumentNonBlocking(roomRef, {
      [`typing.${user.uid}`]: isTyping ? serverTimestamp() : deleteField()
    });
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    updateTypingStatus(val.length > 0);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 4000);
  };

  const handleSend = (type: 'text' | 'image' | 'view-once' | 'screenshot-attempt' = 'text', content?: string) => {
    const finalContent = content || inputValue.trim();
    if (!finalContent && type !== 'screenshot-attempt') return;
    if (!conversationId || !user) return;

    if (editingMessage && type !== 'screenshot-attempt') {
      const msgRef = doc(db, 'chatRooms', conversationId, 'messages', editingMessage.id);
      updateDocumentNonBlocking(msgRef, {
        content: finalContent,
        updatedAt: serverTimestamp(),
        isEdited: true
      });
      setEditingMessage(null);
      setInputValue('');
      updateTypingStatus(false);
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
      reactions: {}
    };

    if (replyingTo && type !== 'screenshot-attempt') {
      messageData.replyTo = replyingTo.id;
      messageData.replyToContent = replyingTo.content;
    }

    if (type === 'view-once') messageData.openedBy = [];

    addDocumentNonBlocking(collection(db, 'chatRooms', conversationId, 'messages'), messageData);
    
    updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId), {
      lastMessageText: type === 'image' ? 'Sent a photo' : type === 'view-once' ? 'Sent a Snap' : type === 'screenshot-attempt' ? 'Tried to take a screenshot' : finalContent,
      lastMessageSenderId: user.uid,
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
      [`lastRead.${user.uid}`]: serverTimestamp(),
      [`typing.${user.uid}`]: deleteField()
    });
    
    if (type !== 'screenshot-attempt') {
      setInputValue('');
      setReplyingTo(null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      updateTypingStatus(false);
    }
  };

  const handleReact = (messageId: string, emoji: string) => {
    if (!conversationId || !user) return;
    const msgRef = doc(db, 'chatRooms', conversationId, 'messages', messageId);
    const currentMsg = messages?.find(m => m.id === messageId);
    const existingReaction = currentMsg?.reactions?.[user.uid];

    if (existingReaction === emoji) {
      updateDocumentNonBlocking(msgRef, { [`reactions.${user.uid}`]: deleteField() });
    } else {
      updateDocumentNonBlocking(msgRef, { [`reactions.${user.uid}`]: emoji });
    }
  };

  const handleWallpaperSelect = (url: string | null) => {
    if (!roomRef) return;
    updateDocumentNonBlocking(roomRef, { wallpaperUrl: url });
    toast({ title: url ? "Wallpaper updated" : "Wallpaper removed" });
  };

  const handleCustomWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && roomRef) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateDocumentNonBlocking(roomRef, { wallpaperUrl: reader.result as string });
        toast({ title: "Custom wallpaper set!" });
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePinChat = () => {
    if (!roomRef || !user) return;
    const isPinned = room?.pinned?.[user.uid];
    updateDocumentNonBlocking(roomRef, {
      [`pinned.${user.uid}`]: !isPinned
    });
    toast({ title: isPinned ? "Unpinned from top" : "Pinned to top" });
  };

  const deleteChatHistory = async () => {
    if (!conversationId || !db) return;
    const q = query(collection(db, 'chatRooms', conversationId, 'messages'));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId), {
      lastMessageText: 'Chat history cleared',
      updatedAt: serverTimestamp()
    });
    toast({ title: "Chat history deleted" });
  };

  const otherUser = useMemo(() => {
    if (!room || !participants || !user) return null;
    return participants.find(p => p.id !== user.uid);
  }, [room, participants, user]);

  const otherUserLastRead = useMemo(() => {
    if (!room?.lastRead || !otherUser) return null;
    return room.lastRead[otherUser.id];
  }, [room?.lastRead, otherUser]);

  const isTyping = useMemo(() => {
    if (!room?.typing || !user) return false;
    return Object.entries(room.typing).some(([id, timestamp]: any) => {
      if (id === user.uid) return false;
      const ts = timestamp?.toMillis ? timestamp.toMillis() : 0;
      return (Date.now() - ts) < 5000;
    });
  }, [room?.typing, user]);

  const wallpapers = wallpaperData.placeholderImages.filter(img => img.id.startsWith('wallpaper-'));

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-center p-8 animate-in-fade h-full max-w-full">
        <div className="h-32 w-32 bg-muted/30 flex items-center justify-center rounded-[3rem] mb-8 border border-border/50">
          <MessageSquare className="h-14 w-14 text-muted-foreground/20" />
        </div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Choose a Friend</h2>
        <p className="text-muted-foreground mt-3 max-w-[240px] font-bold text-sm uppercase tracking-widest opacity-60">Send a Snap or text to start the conversation.</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex-1 flex flex-col h-full bg-background relative overflow-hidden max-w-full transition-all duration-300",
      isBlurred && "blur-xl grayscale pointer-events-none"
    )}>
      {room?.wallpaperUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img 
            src={room.wallpaperUrl} 
            alt="Wallpaper" 
            className="h-full w-full object-cover" 
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
        </div>
      )}

      <header className="h-20 px-6 flex items-center justify-between border-b border-border/40 shrink-0 bg-background/95 backdrop-blur-xl z-30 max-w-full">
        <div className="flex items-center gap-4 min-w-0">
          {onBack && (
            <button className="h-10 w-10 rounded-full hover:bg-muted flex items-center justify-center shrink-0" onClick={onBack}>
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "p-0.5 rounded-full ring-2 ring-offset-2 ring-offset-background shrink-0",
              otherUser?.onlineStatus ? "ring-accent" : "ring-transparent"
            )}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherUser?.profilePictureUrl} />
                <AvatarFallback className="font-bold">{otherUser?.username?.[0]}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-black uppercase tracking-tighter leading-none truncate">{room?.isGroupChat ? room.name : otherUser?.username}</h3>
                {room?.pinned?.[user?.uid] && <Pin className="h-3 w-3 text-primary fill-current" />}
              </div>
              <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] mt-1.5", isTyping ? "text-accent animate-pulse" : (otherUser?.onlineStatus ? "text-accent" : "text-muted-foreground opacity-50"))}>
                {isTyping ? "Typing..." : (otherUser?.onlineStatus ? "Active Now" : "Away")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-muted/80 border border-border/50 shadow-sm">
                <Info className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md bg-card/98 backdrop-blur-2xl border-l border-border/50 shadow-2xl p-0">
              <SheetHeader className="p-10 border-b border-border/50 bg-muted/20">
                <SheetTitle className="sr-only">Conversation Info</SheetTitle>
                <div className="flex flex-col items-center gap-6">
                  <Avatar className="h-32 w-32 border-4 border-background shadow-2xl ring-4 ring-primary/20">
                    <AvatarImage src={room?.isGroupChat ? room.groupImageUrl : otherUser?.profilePictureUrl} />
                    <AvatarFallback className="text-4xl font-black bg-muted text-primary">{room?.name?.[0] || otherUser?.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-center space-y-1">
                     <h2 className="text-2xl font-black uppercase italic tracking-tighter">{room?.isGroupChat ? room.name : (otherUser?.username || "Friend")}</h2>
                     {room?.isGroupChat ? (
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Created {room?.createdAt?.toDate ? format(room.createdAt.toDate(), 'MMM yyyy') : ''}</p>
                     ) : (
                       <p className="text-sm font-medium text-muted-foreground line-clamp-2 px-4">{otherUser?.bio || "No bio yet"}</p>
                     )}
                  </div>
                  <div className="flex gap-4">
                    <Button variant="outline" size="sm" onClick={togglePinChat} className="rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest">
                      {room?.pinned?.[user?.uid] ? <><PinOff className="h-3 w-3" /> Unpin</> : <><Pin className="h-3 w-3" /> Pin Chat</>}
                    </Button>
                  </div>
                </div>
              </SheetHeader>
              
              <div className="p-8 space-y-8 h-full overflow-y-auto scrollbar-hide">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] font-black uppercase tracking-custom text-muted-foreground">Chat Wallpaper</h4>
                    <button 
                      onClick={() => wallpaperInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary hover:opacity-80"
                    >
                      <Upload className="h-3 w-3" /> Upload
                    </button>
                    <input type="file" id="custom-wallpaper" border-none ref={wallpaperInputRef} className="hidden" accept="image/*" onChange={handleCustomWallpaperUpload} />
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                    <button 
                      onClick={() => handleWallpaperSelect(null)}
                      className={cn(
                        "h-20 w-14 shrink-0 rounded-xl border-2 flex items-center justify-center transition-all",
                        !room?.wallpaperUrl ? "border-primary bg-primary/10" : "border-border/50 bg-muted/30"
                      )}
                    >
                      <X className="h-4 w-4 opacity-50" />
                    </button>
                    {wallpapers.map((wp) => (
                      <button
                        key={wp.id}
                        onClick={() => handleWallpaperSelect(wp.imageUrl)}
                        className={cn(
                          "h-20 w-14 shrink-0 rounded-xl border-2 overflow-hidden transition-all relative group",
                          room?.wallpaperUrl === wp.imageUrl ? "border-primary scale-110 shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
                        )}
                      >
                        <img src={wp.imageUrl} alt={wp.description} className="h-full w-full object-cover" data-ai-hint={wp.imageHint} />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-custom text-muted-foreground ml-2">Privacy Settings</h4>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-[2rem] border border-border/50">
                    <div className="flex items-center gap-4">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="text-xs font-black uppercase tracking-widest">Vanish Mode</span>
                    </div>
                    <Switch checked={room?.vanishMode || false} onCheckedChange={(v) => roomRef && updateDocumentNonBlocking(roomRef, { vanishMode: v })} />
                  </div>
                </div>

                <div className="pt-8 border-t border-border/50 space-y-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full h-14 rounded-[2rem] font-black uppercase tracking-widest border-border hover:bg-muted transition-all">
                        <MessageSquare className="h-4 w-4 mr-2" /> Clear History
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem] border-none bg-card shadow-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Clear History?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-medium">
                          All messages in this chat will be deleted for everyone. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="rounded-xl bg-primary font-black uppercase tracking-widest" onClick={deleteChatHistory}>Clear All</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full h-16 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-destructive/20 border border-destructive/20 bg-destructive/5 hover:bg-destructive hover:text-white transition-all">
                        <Trash2 className="h-5 w-5 mr-2" /> Delete Chat
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem] border-none bg-card shadow-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Delete Chat?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-medium">
                          This will remove you from the conversation and delete all data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="rounded-xl bg-destructive font-black uppercase tracking-widest" onClick={() => {
                          if (roomRef) deleteDocumentNonBlocking(roomRef);
                          onBack?.();
                          toast({ title: "Chat Deleted" });
                        }}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <div className="text-center py-4 opacity-30">
                    <p className="text-[9px] font-black uppercase tracking-custom">kith &copy; 2026</p>
                    <p className="text-[7px] font-black uppercase tracking-widest text-primary">Made by Himanshu</p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-4 px-2 scrollbar-hide flex flex-col bg-transparent relative z-10 max-w-full"
      >
        <div className="relative z-10 flex flex-col flex-1 max-w-full">
          <div ref={topSentinelRef} className="h-4 w-full shrink-0" />
          {messages?.map((msg, idx) => {
            const isMe = msg.senderId === user?.uid;
            const sender = isMe ? currentUserData : participants?.find(p => p.id === msg.senderId);
            
            const msgDate = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const prevMsgDate = prevMsg?.createdAt?.toDate ? prevMsg.createdAt.toDate() : null;
            const showDate = !prevMsgDate || !isSameDay(msgDate, prevMsgDate);

            const isSameSenderAsPrev = prevMsg && prevMsg.senderId === msg.senderId;
            const showAvatar = showDate || !isSameSenderAsPrev;

            return (
              <React.Fragment key={msg.id}>
                {showDate && <DateSeparator date={msgDate} hasWallpaper={!!room?.wallpaperUrl} />}
                <MessageItem 
                  msg={msg}
                  isMe={isMe}
                  sender={sender}
                  currentUserId={user?.uid}
                  otherUserLastRead={otherUserLastRead}
                  hasWallpaper={!!room?.wallpaperUrl}
                  showAvatar={showAvatar}
                  onAction={(action: string, m: any) => {
                     if (action === 'delete') {
                       updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId, 'messages', m.id), { isDeleted: true });
                     }
                     if (action === 'reply') setReplyingTo(m);
                     if (action === 'edit') {
                       setEditingMessage(m);
                       setInputValue(m.content);
                     }
                  }}
                  onReact={(emoji: string) => handleReact(msg.id, emoji)}
                  onImageClick={(url: string, id?: string, viewOnce?: boolean) => {
                    setLightboxImage({ url, id, isViewOnce: viewOnce });
                    if (viewOnce && id && user) {
                      const msgRef = doc(db, 'chatRooms', conversationId, 'messages', id);
                      updateDocumentNonBlocking(msgRef, {
                        openedBy: arrayUnion(user.uid)
                      });
                    }
                  }}
                />
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} className="h-4 w-full shrink-0" />
        </div>
      </div>

      <footer className="p-4 md:p-6 bg-background border-t border-border/40 shrink-0 z-30 max-w-full">
        <div className="max-w-4xl mx-auto space-y-3">
          {replyingTo && (
            <div className="px-6 py-2.5 bg-primary/10 rounded-[1.5rem] flex items-center justify-between border border-primary/20 animate-in slide-in-from-bottom-2">
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Replying</span>
                <p className="text-xs font-bold truncate opacity-80">{replyingTo.content}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-primary/20" onClick={() => setReplyingTo(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {editingMessage && (
            <div className="px-6 py-2.5 bg-secondary/10 rounded-[1.5rem] flex items-center justify-between border border-secondary/20 animate-in slide-in-from-bottom-2">
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary">Editing Message</span>
                <p className="text-xs font-bold truncate opacity-80">{editingMessage.content}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-secondary/20" onClick={() => { setEditingMessage(null); setInputValue(''); updateTypingStatus(false); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-3 bg-muted/60 rounded-[2.5rem] p-1.5 pl-2.5 border border-border/50 shadow-inner focus-within:ring-4 ring-primary/5 transition-all max-w-full">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground hover:bg-background hover:text-primary transition-all shadow-sm bg-background/80 shrink-0"
            >
              <Camera className="h-5 w-5" />
            </button>
            <input type="file" id="chat-file-input" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
               const file = e.target.files?.[0];
               if (file) {
                 const reader = new FileReader();
                 reader.onloadend = () => handleSend(isViewOnceEnabled ? 'view-once' : 'image', reader.result as string);
                 reader.readAsDataURL(file);
               }
            }} />
            
            <Textarea 
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Start a Chat..."
              className="bg-transparent border-none min-h-[40px] h-[40px] focus-visible:ring-0 text-[15px] font-bold resize-none py-2 px-1 placeholder:opacity-50 flex-1"
            />

            <div className="flex items-center gap-2 pr-1 shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-11 w-11 rounded-full transition-all", isViewOnceEnabled && "text-primary bg-primary/10")}
                onClick={() => setIsViewOnceEnabled(!isViewOnceEnabled)}
                title="View Once"
              >
                <Eye className="h-5 w-5" />
              </Button>
              <Button 
                onClick={() => handleSend()} 
                disabled={!inputValue.trim()}
                className="h-11 px-4 rounded-full bg-foreground text-background font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                {editingMessage ? 'Update' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-full h-svh p-0 border-none bg-black rounded-none">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {lightboxImage && <img src={lightboxImage.url} alt="Snap" className="max-w-full max-h-full object-contain rounded-[2rem] shadow-2xl" />}
            <Button variant="ghost" size="icon" className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-xl h-12 w-12" onClick={() => setLightboxImage(null)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
