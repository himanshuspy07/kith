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
  SheetFooter
} from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay, differenceInMinutes, formatDistanceToNow, addHours } from 'date-fns';
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

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "💯", "🙌", "✨", "🚀"];

const LinkPreview = ({ url }: { url: string }) => {
  return (
    <div className="mt-2 p-3 rounded-xl bg-black/10 dark:bg-white/5 border border-white/10 flex items-center gap-3 max-w-full">
      <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
        <ExternalLink className="h-5 w-5 text-primary" />
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Web Link</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs truncate hover:underline text-accent font-medium">
          {url}
        </a>
      </div>
    </div>
  );
};

const TypingAnimation = () => (
  <div className="flex items-center gap-1 h-2">
    <div className="typing-dot" />
    <div className="typing-dot" />
    <div className="typing-dot" />
  </div>
);

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

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = msg.content?.match(urlRegex);

  const renderMarkdown = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) return <span key={`mention-${i}`} className="mention">{part}</span>;
      return <React.Fragment key={`part-${i}`}>{part}</React.Fragment>;
    });
  };

  const handleViewOnceClick = () => {
    if (isOpened) return;
    onImageClick(msg.content, msg.id, true);
  };

  return (
    <div className={cn(
      "flex flex-col animate-in-fade px-2", 
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
          <Reply className="h-3.5 w-3.5 inline mr-1 opacity-50" />
          {msg.replyToContent}
        </div>
      )}

      <div className={cn(
        "group relative flex items-center gap-1.5 max-w-full",
        isMe ? "flex-row" : "flex-row-reverse"
      )}>
        <div className={cn(
          "flex items-center transition-all duration-200 gap-0.5",
          "md:opacity-0 md:group-hover:opacity-100",
          "opacity-100" 
        )}>
          {!msg.isDeleted && !isViewOnce && (
            <div className="flex items-center gap-0.5">
               <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5" 
                onClick={() => onAction('reply', msg)}
              >
                <Reply className="h-3.5 w-3.5" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                    <Smile className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1 bg-card/90 backdrop-blur-xl border-black/5 dark:border-white/10 rounded-full shadow-2xl z-[60]">
                  <div className="flex gap-1 flex-wrap max-w-[200px] p-2 justify-center">
                    {REACTION_EMOJIS.map(emoji => (
                      <button 
                        key={emoji} 
                        className={cn(
                          "h-10 w-10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-lg",
                          Array.isArray(reactions[emoji]) && reactions[emoji].includes(currentUserId) && "bg-primary/20"
                        )}
                        onClick={() => onReact(msg, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isMe ? "end" : "start"} className="bg-card/95 backdrop-blur-xl border-white/5 rounded-2xl p-1">
                  <DropdownMenuItem onClick={() => onAction('forward', msg)} className="gap-2 p-3 rounded-xl">
                    <Forward className="h-4 w-4" /> Forward Message
                  </DropdownMenuItem>
                  {isMe && (
                    <>
                      <DropdownMenuItem onClick={() => onAction('edit', msg)} className="gap-2 p-3 rounded-xl">
                        <Edit2 className="h-4 w-4" /> Edit Message
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction('delete', msg)} className="gap-2 p-3 rounded-xl text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" /> Delete Message
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className={cn(
          "rounded-2xl text-[13px] leading-relaxed shadow-lg transition-all relative max-w-[85vw] md:max-w-[400px]",
          isMe 
            ? "bg-primary text-primary-foreground rounded-br-none message-shadow-me" 
            : "bg-black/[0.05] dark:bg-white/[0.05] backdrop-blur-md border border-black/5 dark:border-white/5 text-foreground rounded-bl-none message-shadow",
          (msg.type === 'image' || isViewOnce) ? 'p-1 cursor-zoom-in' : 'p-3 md:p-4',
          msg.isDeleted && "italic opacity-50",
          isGrouped && (isMe ? "rounded-tr-none" : "rounded-tl-none"),
          msg.vanishMode && "border-dashed border-accent/40"
        )}
        onClick={() => {
          if (msg.type === 'image') onImageClick(msg.content);
          if (isViewOnce) handleViewOnceClick();
        }}
        >
          {msg.vanishMode && (
            <div className="absolute -top-2 -right-2 h-5 w-5 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-lg border-2 border-background">
              <Clock className="h-3 w-3" />
            </div>
          )}
          
          <span className="sr-only">Message Content</span>
          {msg.forwardedFrom && (
            <div className="flex items-center gap-1 opacity-50 text-[9px] font-bold uppercase tracking-widest mb-1">
              <Forward className="h-2.5 w-2.5" /> Forwarded
            </div>
          )}
          {isViewOnce ? (
            <div className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                {isOpened ? <EyeOff className="h-5 w-5 opacity-40" /> : <Eye className="h-5 w-5 text-accent" />}
              </div>
              <div className="flex flex-col">
                <span className="font-bold">{isOpened ? "Photo Opened" : "View Once Photo"}</span>
                {!isOpened && <span className="text-[10px] opacity-60">Tap to view</span>}
              </div>
            </div>
          ) : msg.type === 'image' ? (
            <img src={msg.content} alt="Shared" className="rounded-xl max-w-full h-auto object-cover max-h-64" />
          ) : (
            <>
              {renderMarkdown(msg.content)}
              {urls?.map((url: string, i: number) => <LinkPreview key={i} url={url} />)}
            </>
          )}
          {msg.isEdited && !msg.isDeleted && (
            <span className="block text-[8px] opacity-40 mt-1 text-right uppercase tracking-widest font-bold">edited</span>
          )}
          
          {hasReactions && (
            <div className={cn(
              "absolute -bottom-4 flex flex-wrap gap-1 z-10",
              isMe ? "right-0" : "left-0"
            )}>
              {Object.entries(reactions).map(([emoji, uids]: [string, any]) => Array.isArray(uids) && uids.length > 0 && (
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
      </div>

      <div className="mt-1 px-1 flex items-center gap-1.5">
        {isMe && !msg.isDeleted && (
          <div className="flex items-center gap-0.5 mr-1">
            {isReadByOthers ? (
              <CheckCheck className="h-3 w-3 text-accent animate-in zoom-in duration-300" />
            ) : (
              <Check className="h-3 w-3 text-white/40" />
            )}
          </div>
        )}
        {!isGrouped && msg.createdAt?.toDate && (
          <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">
            {format(msg.createdAt.toDate(), 'HH:mm')}
          </span>
        )}
        {isMe && !isGrouped && <div className="h-1 w-1 rounded-full bg-accent" />}
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
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [lightboxImage, setLightboxImage] = useState<{url: string, id?: string, isViewOnce?: boolean} | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [messageLimit, setMessageLimit] = useState(30);

  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupImageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const roomRef = useMemoFirebase(() => {
    if (!db || !conversationId) return null;
    return doc(db, 'chatRooms', conversationId);
  }, [db, conversationId]);
  const { data: room, isLoading: isRoomLoading } = useDoc(roomRef);

  useEffect(() => {
    if (room && user && roomRef) {
      const isUnread = room.lastMessageText && 
                       room.lastMessageSenderId !== user.uid && 
                       (!room.readBy || !room.readBy.includes(user.uid));

      if (isUnread) {
        const nextReadBy = Array.from(new Set([...(room.readBy || []), user.uid]));
        updateDocumentNonBlocking(roomRef, { readBy: nextReadBy });
      }
    }
  }, [room, user, roomRef]);

  const participantsQuery = useMemoFirebase(() => {
    if (!db || !room?.memberIds || room.memberIds.length === 0) return null;
    return query(collection(db, 'users'), where('id', 'in', room.memberIds.slice(0, 30)));
  }, [db, room?.memberIds]);
  const { data: participants } = useCollection(participantsQuery);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !conversationId || !user) return null;
    return query(
      collection(db, 'chatRooms', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limitToLast(messageLimit)
    );
  }, [db, conversationId, messageLimit]);
  const { data: messages } = useCollection(messagesQuery);

  useEffect(() => {
    if (!messages || !user || !conversationId || !db) return;

    messages.forEach((msg) => {
      if (msg.senderId !== user.uid && (!msg.readBy || !msg.readBy.includes(user.uid))) {
        const msgRef = doc(db, 'chatRooms', conversationId, 'messages', msg.id);
        const nextReadBy = Array.from(new Set([...(msg.readBy || []), user.uid]));
        updateDocumentNonBlocking(msgRef, { readBy: nextReadBy });
      }
    });
  }, [messages, user?.uid, conversationId, db]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setShowMentions(true);
        setMentionFilter(textAfterAt.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
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
      handleSend('text', '⚠️ Potential screen capture or app switch detected.');
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
      toast({ title: "Message Deleted" });
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

  const handleImageClick = (url: string, id?: string, isViewOnce?: boolean) => {
    setLightboxImage({ url, id, isViewOnce });
    if (isViewOnce && id && user && db && conversationId) {
      const msgRef = doc(db, 'chatRooms', conversationId, 'messages', id);
      updateDocumentNonBlocking(msgRef, {
        openedBy: Array.from(new Set([...(messages?.find(m => m.id === id)?.openedBy || []), user.uid]))
      });
    }
  };

  const activeMessages = useMemo(() => {
    if (!messages) return [];
    const now = new Date();
    return messages.filter(msg => {
      if (!msg.expiresAt) return true;
      const expiry = msg.expiresAt.toDate ? msg.expiresAt.toDate() : new Date(msg.expiresAt);
      return expiry > now;
    });
  }, [messages]);

  const otherUser = useMemo(() => {
    if (!room || room.isGroupChat || !participants || !user) return null;
    return participants.find(p => p.id !== user.uid);
  }, [room, participants, user]);

  const chatDisplayName = useMemo(() => {
    if (!room) return 'Loading...';
    if (otherUser) return otherUser.username;
    return room.name || 'Conversation';
  }, [room, otherUser]);

  const chatAvatar = useMemo(() => {
    if (!room) return null;
    if (room.isGroupChat) return room.groupImageUrl;
    return otherUser?.profilePictureUrl;
  }, [room, otherUser]);

  const typingUsers = useMemo(() => {
    if (!room?.typing || !participants || !user) return [];
    return Object.keys(room.typing)
      .filter(id => id !== user.uid)
      .map(id => participants.find(p => p.id === id)?.username)
      .filter(Boolean);
  }, [room?.typing, participants, user]);

  const presenceText = useMemo(() => {
    if (room?.isGroupChat) return "Group Conversation";
    if (!otherUser || !hasMounted) return "Offline";
    const lastActive = otherUser.lastActiveAt?.toDate?.() || new Date(0);
    const isRecentlyActive = differenceInMinutes(new Date(), lastActive) < 3;
    if (otherUser.onlineStatus === true && isRecentlyActive) return "Active Now";
    try {
      return `Last active ${formatDistanceToNow(lastActive)} ago`;
    } catch (e) {
      return "Offline";
    }
  }, [room?.isGroupChat, otherUser, hasMounted]);

  const handleDeleteConversation = () => {
    if (!roomRef || !onBack) return;
    deleteDocumentNonBlocking(roomRef);
    toast({ title: "Conversation Deleted" });
    onBack();
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
        <MessageSquare className="h-16 w-16 text-muted-foreground/10 mb-6" />
        <h2 className="text-xl font-bold tracking-tight">Select a conversation</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Choose a chat from the sidebar to start messaging.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <div 
        className="absolute inset-0 z-0 transition-all duration-700 ease-in-out pointer-events-none opacity-40 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: room?.wallpaper || 'none' }}
      />
      
      <header className="h-16 md:h-20 px-4 md:px-6 flex items-center justify-between glass-morphism sticky top-0 z-10 mx-0 mt-0 md:mx-4 md:mt-4 md:rounded-2xl shadow-lg border-white/5 transition-all">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-9 w-9 md:h-10 md:w-10 border border-white/10 shrink-0 shadow-sm">
            <AvatarImage src={chatAvatar || undefined} className="object-cover" />
            <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs md:text-sm">{chatDisplayName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2">
               <h3 className="text-sm font-bold leading-none truncate">{chatDisplayName}</h3>
               {room?.pinnedBy?.[user?.uid || ''] && <Pin className="h-3 w-3 text-primary fill-primary" />}
               {room?.vanishMode && <ShieldAlert className="h-3 w-3 text-accent" />}
            </div>
            <div className={cn(
              "text-[10px] truncate mt-1 font-medium italic flex items-center gap-1.5",
              typingUsers.length > 0 ? "text-accent" : "text-muted-foreground"
            )}>
              {typingUsers.length > 0 ? (
                <>
                  <TypingAnimation />
                  <span>{typingUsers.join(', ')} is typing</span>
                </>
              ) : presenceText}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 dark:hover:bg-white/5 shrink-0 transition-transform active:scale-90">
                <Info className="h-5 w-5 text-muted-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-card/95 backdrop-blur-xl border-black/5 dark:border-white/10 w-full sm:max-w-md flex flex-col p-0 rounded-l-[2.5rem] shadow-2xl">
              <SheetHeader className="p-8 pb-4">
                <SheetTitle className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Conversation Info</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-8 p-8 pt-0 scrollbar-hide">
                <div className="flex flex-col items-center text-center gap-4 py-4">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 md:h-32 md:w-32 shadow-2xl border-4 border-white/5">
                      <AvatarImage src={chatAvatar || undefined} className="object-cover" />
                      <AvatarFallback className="text-3xl font-bold bg-primary/20 text-primary">{chatDisplayName?.[0]}</AvatarFallback>
                    </Avatar>
                    {room?.isGroupChat && room?.createdBy === user?.uid && (
                      <button onClick={() => groupImageInputRef.current?.click()} className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="h-6 w-6 text-white" />
                      </button>
                    )}
                    <input type="file" ref={groupImageInputRef} className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || !roomRef) return;
                      const reader = new FileReader();
                      reader.onloadend = () => updateDocumentNonBlocking(roomRef, { groupImageUrl: reader.result as string });
                      reader.readAsDataURL(file);
                    }} />
                  </div>
                  <div className="space-y-1 w-full flex flex-col items-center">
                    {isEditingGroupName ? (
                      <div className="flex items-center gap-2 w-full max-w-[200px]">
                        <Input 
                          value={newGroupName} 
                          onChange={(e) => setNewGroupName(e.target.value)} 
                          className="h-8 rounded-lg bg-black/10"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-accent" onClick={() => {
                           if (!roomRef || !newGroupName.trim()) return;
                           updateDocumentNonBlocking(roomRef, { name: newGroupName.trim(), nameLowercase: newGroupName.trim().toLowerCase() });
                           setIsEditingGroupName(false);
                        }}><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setIsEditingGroupName(false)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-black tracking-tighter uppercase italic">{chatDisplayName}</h3>
                        {room?.isGroupChat && room?.createdBy === user?.uid && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setIsEditingGroupName(true); setNewGroupName(room.name); }}><Settings2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 text-primary">
                      <Palette className="h-3 w-3" /> Chat Wallpaper
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {WALLPAPERS.map((wp) => (
                        <button
                          key={wp.id}
                          onClick={() => roomRef && updateDocumentNonBlocking(roomRef, { wallpaper: wp.value })}
                          className={cn(
                            "aspect-square rounded-xl border-2 transition-all group relative overflow-hidden",
                            room?.wallpaper === wp.value ? "border-primary scale-105 shadow-lg" : "border-transparent hover:border-white/10"
                          )}
                        >
                          <div className={cn("absolute inset-0", wp.preview)} />
                          {wp.id !== 'none' && <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: wp.value }} />}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] font-bold text-white uppercase tracking-tighter">{wp.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-accent" />
                      <div>
                        <p className="text-sm font-bold">Vanish Mode</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Self-destructing messages</p>
                      </div>
                    </div>
                    <Switch checked={room?.vanishMode || false} onCheckedChange={(val) => roomRef && updateDocumentNonBlocking(roomRef, { vanishMode: val })} />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full h-12 rounded-xl font-bold flex gap-2">
                        <Trash2 className="h-4 w-4" /> Delete Conversation
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem] p-10 bg-card border-none shadow-2xl">
                      <AlertDialogHeader className="space-y-4">
                        <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter italic">Delete Entire Chat?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground leading-relaxed">
                          This action is permanent. All messages and media in this conversation will be deleted for everyone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-8 gap-4">
                        <AlertDialogCancel className="h-12 rounded-xl border-white/5 font-bold">Keep Conversation</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteConversation}
                          className="h-12 rounded-xl bg-destructive text-destructive-foreground font-bold"
                        >
                          Confirm Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-2 md:px-6 py-4 md:py-8 space-y-2 scrollbar-hide z-[1]">
        {messages && messages.length >= messageLimit && (
          <div className="flex justify-center pb-6">
            <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground" onClick={() => setMessageLimit(prev => prev + 30)}>
              <ChevronUp className="h-3 w-3 mr-1" /> Load earlier
            </Button>
          </div>
        )}
        
        {activeMessages.map((msg, idx) => (
          <MessageItem 
            key={msg.id}
            msg={msg}
            isMe={msg.senderId === user?.uid}
            sender={participants?.find(p => p.id === msg.senderId)}
            isGroupChat={room?.isGroupChat}
            onAction={handleAction}
            onReact={handleReact}
            onImageClick={handleImageClick}
            currentUserId={user?.uid}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 md:p-8 bg-transparent z-10 transition-all duration-500">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className={cn(
            "flex flex-col gap-2 glass-morphism p-3 md:p-4 shadow-2xl transition-all duration-500 group focus-within:ring-2 focus-within:ring-primary/20 rounded-[2rem]",
            room?.vanishMode && "ring-2 ring-accent/30"
          )}>
            <div className="flex items-end gap-3">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
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
              }} />
              <div className="flex flex-col gap-2 shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-10 w-10 rounded-xl", isViewOnceEnabled && "bg-accent/20 text-accent")}
                  onClick={() => setIsViewOnceEnabled(!isViewOnceEnabled)}
                >
                  {isViewOnceEnabled ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => fileInputRef.current?.click()}>
                  {isUploading ? <Loader2 className="animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                </Button>
              </div>
              
              <Textarea 
                value={inputValue} 
                onChange={handleInputChange} 
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={isViewOnceEnabled ? "🔒 View-once message..." : "Message kith..."}
                className="bg-transparent border-none min-h-[40px] h-[40px] focus-visible:ring-0 text-base resize-none py-2"
              />

              <Button onClick={() => handleSend()} disabled={!inputValue.trim() || isUploading} className="h-12 w-12 rounded-2xl shrink-0">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ForwardDialog open={!!forwardingMessage} onOpenChange={(open) => !open && setForwardingMessage(null)} messageToForward={forwardingMessage} />

      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-0 border-none bg-black/95 flex items-center justify-center overflow-hidden rounded-3xl">
          <div className="relative group w-full h-full flex flex-col items-center justify-center p-4">
            {lightboxImage && (
              <img src={lightboxImage.url} alt="Content" className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
            )}
            {lightboxImage?.isViewOnce && (
              <div className="mt-6 flex flex-col items-center gap-2 text-white">
                <AlertTriangle className="h-8 w-8 text-accent animate-pulse" />
                <p className="font-bold">This is a view-once photo.</p>
                <p className="text-xs opacity-60">It will disappear when you close this window.</p>
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