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
  Camera,
  Pin,
  Info,
  LogOut,
  ChevronUp,
  Check,
  CheckCheck,
  Forward,
  ExternalLink,
  UserMinus,
  Settings2,
  Clock,
  ShieldAlert,
  Eye,
  EyeOff,
  AlertTriangle,
  Palette
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger, 
} from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
import { format, differenceInMinutes, formatDistanceToNow, addHours } from 'date-fns';
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
  deleteField
} from 'firebase/firestore';
import { 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import ForwardDialog from './ForwardDialog';

interface ChatWindowProps {
  conversationId?: string;
  onBack?: () => void;
}

const WALLPAPERS = [
  { id: 'none', name: 'Clean', value: 'transparent', preview: 'bg-background' },
  { id: 'stars', name: 'Stars', value: 'url("https://picsum.photos/seed/stars1/1200/800")', preview: 'bg-slate-950' },
  { id: 'galaxy', name: 'Galaxy', value: 'url("https://picsum.photos/seed/galaxy1/1200/800")', preview: 'bg-indigo-950' },
  { id: 'animals', name: 'Animals', value: 'url("https://picsum.photos/seed/animals1/1200/800")', preview: 'bg-amber-950' },
  { id: 'love', name: 'Love', value: 'url("https://picsum.photos/seed/love1/1200/800")', preview: 'bg-rose-950' },
  { id: 'nature', name: 'Nature', value: 'url("https://picsum.photos/seed/nature1/1200/800")', preview: 'bg-emerald-950' },
  { id: 'abstract', name: 'Abstract', value: 'url("https://picsum.photos/seed/abstract1/1200/800")', preview: 'bg-purple-950' },
];

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "💯", "🙌"];

const MessageItem = memo(({ 
  msg, 
  isMe, 
  isGrouped, 
  sender, 
  isGroupChat, 
  onAction, 
  onReact, 
  onImageClick,
  currentUserId 
}: any) => {
  const reactions = msg.reactions || {};
  const hasReactions = Object.values(reactions).some((uids: any) => Array.isArray(uids) && uids.length > 0);
  const isReadByOthers = msg.readBy && msg.readBy.some((uid: string) => uid !== msg.senderId);
  const isViewOnce = msg.type === 'view-once';
  const isOpened = isViewOnce && msg.openedBy && msg.openedBy.includes(currentUserId);

  const timeStr = msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : '';

  const renderMarkdown = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) return <span key={`mention-${i}`} className="mention">{part}</span>;
      return <React.Fragment key={`part-${i}`}>{part}</React.Fragment>;
    });
  };

  return (
    <div className={cn(
      "flex flex-col animate-in-fade px-4 py-0.5", 
      isMe ? "items-end" : "items-start",
      !isGrouped && "mt-3"
    )}>
      {!isMe && isGroupChat && !isGrouped && (
        <span className="text-[11px] font-bold text-primary ml-2 mb-1">
          {sender?.username}
        </span>
      )}

      {msg.replyToId && (
        <div className={cn(
          "px-3 py-1.5 mb-[-12px] rounded-t-lg bg-black/5 dark:bg-white/5 border-l-4 border-primary text-[11px] text-muted-foreground opacity-80 max-w-[280px] truncate",
          isMe ? "mr-2" : "ml-2"
        )}>
          {msg.replyToContent}
        </div>
      )}

      <div className={cn(
        "group relative flex items-end gap-2 max-w-full",
        isMe ? "flex-row" : "flex-row-reverse"
      )}>
        {/* Message Utilities */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          {!msg.isDeleted && !isViewOnce && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isMe ? "end" : "start"} className="rounded-xl p-1">
                <DropdownMenuItem onClick={() => onAction('reply', msg)} className="gap-2 rounded-lg">
                  <Reply className="h-4 w-4" /> Reply
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('forward', msg)} className="gap-2 rounded-lg">
                  <Forward className="h-4 w-4" /> Forward
                </DropdownMenuItem>
                {isMe && (
                  <>
                    <DropdownMenuItem onClick={() => onAction('edit', msg)} className="gap-2 rounded-lg">
                      <Edit2 className="h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAction('delete', msg)} className="gap-2 rounded-lg text-destructive">
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* The Bubble */}
        <div className={cn(
          "rounded-2xl text-[14.5px] leading-snug transition-all relative max-w-[85vw] md:max-w-[480px] flex flex-col",
          isMe 
            ? "bg-primary text-white rounded-br-none bubble-shadow-me" 
            : "bg-secondary dark:bg-white/[0.05] text-foreground rounded-bl-none bubble-shadow",
          (msg.type === 'image' || isViewOnce) ? 'p-1 cursor-zoom-in' : 'px-3 py-2 md:px-4 md:py-2.5',
          msg.isDeleted && "italic opacity-50",
          isGrouped && (isMe ? "rounded-tr-none" : "rounded-tl-none")
        )}
        onClick={() => {
          if (msg.type === 'image') onImageClick(msg.content);
          if (isViewOnce && !isOpened) onImageClick(msg.content, msg.id, true);
        }}
        >
          {msg.forwardedFrom && (
            <div className="flex items-center gap-1 opacity-50 text-[10px] font-medium italic mb-1">
              <Forward className="h-3 w-3" /> Forwarded
            </div>
          )}

          {isViewOnce ? (
            <div className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                {isOpened ? <EyeOff className="h-5 w-5 opacity-40" /> : <Eye className="h-5 w-5 text-accent" />}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{isOpened ? "Opened" : "Photo"}</span>
                {!isOpened && <span className="text-[10px] opacity-60">View once</span>}
              </div>
            </div>
          ) : msg.type === 'image' ? (
            <img src={msg.content} alt="Shared" className="rounded-xl max-w-full h-auto object-cover max-h-[320px]" />
          ) : (
            <div className="whitespace-pre-wrap break-words pr-12 relative">
              {renderMarkdown(msg.content)}
              {/* Integrated Time & Status */}
              <div className="absolute bottom-[-2px] right-[-8px] flex items-center gap-1 opacity-60 select-none">
                <span className="text-[10px] font-medium leading-none">{timeStr}</span>
                {isMe && !msg.isDeleted && (
                  isReadByOthers ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />
                )}
              </div>
            </div>
          )}

          {/* Reaction Overlay */}
          {hasReactions && (
            <div className={cn(
              "absolute -bottom-3 flex gap-1 z-10",
              isMe ? "right-1" : "left-1"
            )}>
              {Object.entries(reactions).map(([emoji, uids]: [string, any]) => Array.isArray(uids) && uids.length > 0 && (
                <div 
                  key={emoji}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white dark:bg-secondary shadow-sm border border-border text-[11px]"
                >
                  <span>{emoji}</span>
                  {uids.length > 1 && <span className="font-bold">{uids.length}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isViewOnceEnabled, setIsViewOnceEnabled] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [forwardingMessage, setForwardingMessage] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<{url: string, id?: string, isViewOnce?: boolean} | null>(null);
  const [messageLimit, setMessageLimit] = useState(30);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const roomRef = useMemoFirebase(() => {
    if (!db || !conversationId) return null;
    return doc(db, 'chatRooms', conversationId);
  }, [db, conversationId]);
  const { data: room, isLoading: isRoomLoading } = useDoc(roomRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !conversationId || !user) return null;
    return query(
      collection(db, 'chatRooms', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limitToLast(messageLimit)
    );
  }, [db, conversationId, messageLimit]);
  const { data: messages } = useCollection(messagesQuery);

  const participantsQuery = useMemoFirebase(() => {
    if (!db || !room?.memberIds || room.memberIds.length === 0) return null;
    return query(collection(db, 'users'), where('id', 'in', room.memberIds.slice(0, 30)));
  }, [db, room?.memberIds]);
  const { data: participants } = useCollection(participantsQuery);

  useEffect(() => {
    if (messageLimit === 30) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages?.length, messageLimit]);

  const updateTypingStatus = (isTyping: boolean) => {
    if (!roomRef || !user) return;
    updateDocumentNonBlocking(roomRef, {
      [`typing.${user.uid}`]: isTyping ? serverTimestamp() : deleteField()
    });
  };

  const handleSend = (type: 'text' | 'image' | 'view-once' = 'text', content?: string) => {
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
      vanishMode: room.vanishMode || false
    };

    if (type === 'view-once') {
      messageData.openedBy = [];
    }

    if (room.vanishMode) {
      messageData.expiresAt = addHours(new Date(), 24);
    }

    if (replyingTo) {
      messageData.replyToId = replyingTo.id;
      messageData.replyToContent = replyingTo.type === 'image' ? 'Image' : replyingTo.content;
      setReplyingTo(null);
    }

    addDocumentNonBlocking(collection(db, 'chatRooms', conversationId, 'messages'), messageData);
    updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId), {
      lastMessageText: room.vanishMode ? '🔒 Disappearing message' : (type === 'image' ? 'Sent a photo' : type === 'view-once' ? 'Sent a view-once photo' : finalContent),
      lastMessageSenderId: user.uid,
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
    });
    if (type === 'text') setInputValue('');
  };

  useEffect(() => {
    if (!room?.vanishMode || !conversationId || !user) return;

    const handleBlur = () => {
      handleSend('text', '🚨 Someone just left the chat window or may have taken a screenshot.');
      toast({
        title: "Security Alert",
        description: "Activity outside the chat detected while in Vanish Mode.",
        variant: "destructive",
      });
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [room?.vanishMode, conversationId, user]);

  const handleAction = (action: 'delete' | 'edit' | 'reply' | 'forward', message: any) => {
    if (action === 'delete') {
      const msgRef = doc(db, 'chatRooms', conversationId!, 'messages', message.id);
      updateDocumentNonBlocking(msgRef, {
        content: 'This message was deleted',
        isDeleted: true,
        type: 'text',
        fileUrl: null,
        updatedAt: serverTimestamp()
      });
    } else if (action === 'edit') {
      setEditingMessage(message);
      setInputValue(message.content);
      setReplyingTo(null);
    } else if (action === 'reply') {
      setReplyingTo(message);
      setEditingMessage(null);
    } else if (action === 'forward') {
      setForwardingMessage(message);
    }
  };

  const handleReact = (message: any, emoji: string) => {
    if (!user || !conversationId) return;
    const msgRef = doc(db, 'chatRooms', conversationId, 'messages', message.id);
    const reactions = { ...(message.reactions || {}) };
    const hadThisEmoji = Array.isArray(reactions[emoji]) && reactions[emoji].includes(user.uid);
    
    Object.keys(reactions).forEach(e => {
      if (Array.isArray(reactions[e])) {
        reactions[e] = reactions[e].filter((uid: string) => uid !== user.uid);
        if (reactions[e].length === 0) delete reactions[e];
      }
    });

    if (!hadThisEmoji) {
      if (!reactions[emoji]) reactions[emoji] = [];
      reactions[emoji].push(user.uid);
    }
    updateDocumentNonBlocking(msgRef, { reactions });
  };

  const otherUser = useMemo(() => {
    if (!room || room.isGroupChat || !participants || !user) return null;
    return participants.find(p => p.id !== user.uid);
  }, [room, participants, user]);

  const presenceText = useMemo(() => {
    if (room?.isGroupChat) return `${room.memberIds?.length || 0} participants`;
    if (!otherUser) return "";
    const lastActive = otherUser.lastActiveAt?.toDate?.() || new Date(0);
    const isOnline = otherUser.onlineStatus === true && differenceInMinutes(new Date(), lastActive) < 3;
    return isOnline ? "online" : `last seen ${formatDistanceToNow(lastActive, { addSuffix: true })}`;
  }, [room, otherUser]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-center p-8">
        <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
          <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Simple. Professional.</h2>
        <p className="text-muted-foreground mt-2 max-w-xs">
          Select a chat or start a new conversation to connect with your team.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Dynamic Wallpaper Overlay */}
      <div 
        className="absolute inset-0 z-0 transition-all duration-700 ease-in-out pointer-events-none opacity-40 grayscale-[20%] dark:opacity-20"
        style={{ backgroundImage: room?.wallpaper || 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      
      <header className="h-16 px-4 flex items-center justify-between border-b border-border acrylic sticky top-0 z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10 border border-border shrink-0 shadow-sm">
            <AvatarImage src={room?.isGroupChat ? room.groupImageUrl : otherUser?.profilePictureUrl} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{room?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <h3 className="text-[15px] font-bold leading-tight truncate">
              {room?.isGroupChat ? room.name : otherUser?.username}
            </h3>
            <span className="text-[12px] text-muted-foreground/80 font-medium truncate">
              {presenceText}
            </span>
          </div>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Info className="h-5 w-5 text-muted-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md acrylic border-none shadow-2xl p-0">
             <SheetHeader className="sr-only">
               <SheetTitle>Chat Information</SheetTitle>
             </SheetHeader>
             <div className="p-8 flex flex-col items-center gap-6 overflow-y-auto h-full scrollbar-hide">
                <Avatar className="h-32 w-32 shadow-2xl border-4 border-background">
                  <AvatarImage src={room?.isGroupChat ? room.groupImageUrl : otherUser?.profilePictureUrl} className="object-cover" />
                  <AvatarFallback className="text-4xl font-bold">{room?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center space-y-1">
                  <h3 className="text-2xl font-bold">{room?.name || otherUser?.username}</h3>
                  <p className="text-sm text-muted-foreground">ID: {conversationId}</p>
                </div>

                <div className="w-full space-y-6 pt-4">
                   <div className="space-y-3">
                      <Label className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Palette className="h-4 w-4" /> Wallpaper
                      </Label>
                      <div className="grid grid-cols-4 gap-2">
                        {WALLPAPERS.map(wp => (
                          <button 
                            key={wp.id}
                            onClick={() => roomRef && updateDocumentNonBlocking(roomRef, { wallpaper: wp.value })}
                            className={cn(
                              "aspect-square rounded-lg border-2 transition-all overflow-hidden",
                              room?.wallpaper === wp.value ? "border-primary" : "border-transparent"
                            )}
                          >
                            <div className={cn("w-full h-full", wp.preview)} />
                          </button>
                        ))}
                      </div>
                   </div>

                   <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold">Vanish Mode</span>
                      </div>
                      <Switch checked={room?.vanishMode || false} onCheckedChange={(val) => roomRef && updateDocumentNonBlocking(roomRef, { vanishMode: val })} />
                   </div>

                   <div className="pt-4 border-t border-white/5">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full h-12 rounded-xl font-bold flex gap-2">
                          <Trash2 className="h-4 w-4" /> Delete Conversation
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2rem] border-none bg-card/95 backdrop-blur-xl p-8 max-w-sm">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl font-bold">Erase Chat?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            This action is permanent and will delete history for all participants.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6 gap-3">
                          <AlertDialogCancel className="rounded-xl border-white/10 h-12">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12 font-bold"
                            onClick={() => roomRef && deleteDocumentNonBlocking(roomRef)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
             </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-hide z-[1]">
        {messages?.map((msg, idx) => (
          <MessageItem 
            key={msg.id}
            msg={msg}
            isMe={msg.senderId === user?.uid}
            sender={participants?.find(p => p.id === msg.senderId)}
            isGroupChat={room?.isGroupChat}
            onAction={handleAction}
            onReact={handleReact}
            onImageClick={(url, id, viewOnce) => {
              setLightboxImage({ url, id, isViewOnce: viewOnce });
              if (viewOnce && id && user) {
                const msgRef = doc(db, 'chatRooms', conversationId, 'messages', id);
                updateDocumentNonBlocking(msgRef, {
                  openedBy: Array.from(new Set([...(msg.openedBy || []), user.uid]))
                });
              }
            }}
            currentUserId={user?.uid}
            isGrouped={idx > 0 && messages[idx-1].senderId === msg.senderId && differenceInMinutes(msg.createdAt?.toDate() || new Date(), messages[idx-1].createdAt?.toDate() || new Date()) < 1}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Modern Docked Input Area */}
      <footer className="p-4 acrylic border-t border-border z-10">
        <div className="max-w-5xl mx-auto flex flex-col gap-2">
          {replyingTo && (
            <div className="px-4 py-2 bg-secondary/50 rounded-lg flex items-center justify-between border-l-4 border-primary">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold text-primary">Replying to message</span>
                <span className="text-[13px] text-muted-foreground truncate max-w-md">{replyingTo.content}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}><X className="h-4 w-4" /></Button>
            </div>
          )}
          
          <div className="flex items-end gap-2 bg-secondary/80 dark:bg-white/[0.05] rounded-[1.5rem] p-1 border border-border">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploading(true);
                const reader = new FileReader();
                reader.onloadend = () => {
                  handleSend(isViewOnceEnabled ? 'view-once' : 'image', reader.result as string);
                  setIsUploading(false);
                  setIsViewOnceEnabled(false);
                };
                reader.readAsDataURL(file);
              }} 
            />
            
            <div className="flex gap-1 pb-1 px-1">
               <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-10 w-10 rounded-full", isViewOnceEnabled && "text-primary")}
                onClick={() => setIsViewOnceEnabled(!isViewOnceEnabled)}
              >
                {isViewOnceEnabled ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => fileInputRef.current?.click()}>
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
              </Button>
            </div>

            <Textarea 
              value={inputValue} 
              onChange={(e) => {
                setInputValue(e.target.value);
                updateTypingStatus(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => updateTypingStatus(false), 2000);
              }}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Message kith..."
              className="bg-transparent border-none min-h-[40px] h-[40px] focus-visible:ring-0 text-[15px] resize-none py-2 px-1"
            />

            <Button 
              onClick={() => handleSend()} 
              disabled={!inputValue.trim() || isUploading} 
              className="h-10 w-10 rounded-full shrink-0 mb-1 mr-1"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </footer>

      <ForwardDialog open={!!forwardingMessage} onOpenChange={(open) => !open && setForwardingMessage(null)} messageToForward={forwardingMessage} />

      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-0 border-none bg-black/98 rounded-2xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            {lightboxImage && <img src={lightboxImage.url} alt="Shared" className="max-w-full max-h-[80vh] object-contain rounded-lg" />}
            {lightboxImage?.isViewOnce && (
              <div className="mt-6 text-center text-white space-y-1">
                <p className="font-bold text-lg">One-time view photo</p>
                <p className="text-sm opacity-60">This content will vanish after you close it.</p>
              </div>
            )}
            <Button variant="secondary" size="icon" className="absolute top-4 right-4 rounded-full" onClick={() => setLightboxImage(null)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}