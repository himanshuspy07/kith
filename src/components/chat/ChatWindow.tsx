
"use client";

import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { 
  Send, 
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
  Info,
  Check,
  CheckCheck,
  Forward,
  Eye,
  EyeOff,
  Clock,
  MessageSquare
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
import { format, differenceInMinutes } from 'date-fns';
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
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

interface ChatWindowProps {
  conversationId?: string;
  onBack?: () => void;
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const MessageItem = memo(({ 
  msg, 
  isMe, 
  sender, 
  onAction, 
  onReact, 
  onImageClick,
  currentUserId 
}: any) => {
  const isReadByOthers = msg.readBy && msg.readBy.some((uid: string) => uid !== msg.senderId);
  const isViewOnce = msg.type === 'view-once';
  const isOpened = isViewOnce && msg.openedBy && msg.openedBy.includes(currentUserId);
  const timeStr = msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : '';

  return (
    <div className={cn(
      "flex flex-col animate-in-fade px-6 py-2 group transition-colors", 
      isMe ? "items-start" : "items-start"
    )}>
      <div className="flex items-start gap-4 max-w-full relative">
        <div className="relative shrink-0">
          <Avatar className={cn("h-10 w-10 mt-1", !isMe && sender?.onlineStatus && "ring-2 ring-accent ring-offset-1")}>
            <AvatarImage src={sender?.profilePictureUrl} className="object-cover" />
            <AvatarFallback className="bg-muted text-[10px] font-black">{sender?.username?.[0]}</AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={cn("text-[14px] font-black uppercase tracking-tighter", isMe ? "text-secondary" : "text-primary")}>
              {isMe ? "ME" : sender?.username}
            </span>
            <span className="text-[9px] text-muted-foreground font-black opacity-60 uppercase">{timeStr}</span>
            {msg.isEdited && <span className="text-[8px] text-muted-foreground font-bold uppercase italic opacity-40">Edited</span>}
          </div>

          <div className="relative mt-1">
            {msg.replyTo && (
              <div className="mb-2 p-2 bg-muted/30 border-l-4 border-primary rounded-r-xl text-[11px] max-w-[200px] opacity-70">
                 <p className="font-bold uppercase tracking-widest text-[9px] mb-1">Replying to:</p>
                 <p className="truncate italic">{msg.replyToContent}</p>
              </div>
            )}

            {isViewOnce ? (
              <div 
                onClick={() => !isOpened && onImageClick(msg.content, msg.id, true)}
                className="flex items-center gap-3 py-2 px-4 rounded-2xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors border border-border/50"
              >
                <div className="h-8 w-8 rounded-xl bg-background flex items-center justify-center shadow-sm">
                  {isOpened ? <EyeOff className="h-4 w-4 opacity-40" /> : <Eye className="h-4 w-4 text-primary" />}
                </div>
                <span className="text-sm font-black uppercase tracking-widest">{isOpened ? "Snap Opened" : "New Photo"}</span>
              </div>
            ) : msg.type === 'image' ? (
              <img 
                src={msg.content} 
                alt="Shared" 
                className="rounded-2xl max-w-[280px] h-auto object-cover mt-1 cursor-zoom-in shadow-xl hover:scale-[1.01] transition-transform border border-border/20" 
                onClick={() => onImageClick(msg.content)}
              />
            ) : (
              <div className="relative">
                <p className={cn("text-[16px] font-medium leading-normal break-words py-1", msg.isDeleted && "italic opacity-50 line-through")}>
                  {msg.isDeleted ? "Message deleted" : msg.content}
                </p>
                
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(msg.reactions).map(([emoji, uids]: [string, any]) => (
                      <button 
                        key={emoji} 
                        onClick={() => onReact(msg.id, emoji)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[12px] bg-muted/50 border border-border/50 flex items-center gap-1 hover:bg-muted transition-all",
                          uids.includes(currentUserId) && "bg-primary/20 border-primary/30"
                        )}
                      >
                        <span>{emoji}</span>
                        <span className="text-[10px] font-bold">{uids.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isMe && !msg.isDeleted && (
              <div className="flex items-center gap-1 mt-2 opacity-50">
                {isReadByOthers ? <CheckCheck className="h-3 w-3 text-primary" /> : <Check className="h-3 w-3" />}
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{isReadByOthers ? "Opened" : "Sent"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Floating Quick Actions */}
        {!msg.isDeleted && (
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full opacity-0 group-hover:opacity-100 flex items-center gap-2 pl-4 transition-all pointer-events-none group-hover:pointer-events-auto">
            <button onClick={() => onAction('reply', msg)} className="h-8 w-8 rounded-full bg-card shadow-lg flex items-center justify-center hover:text-primary transition-colors border border-border/50">
              <Reply className="h-4 w-4" />
            </button>
            <button onClick={() => onAction('react', msg)} className="h-8 w-8 rounded-full bg-card shadow-lg flex items-center justify-center hover:text-yellow-500 transition-colors border border-border/50">
              <Smile className="h-4 w-4" />
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

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isViewOnceEnabled, setIsViewOnceEnabled] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<{url: string, id?: string, isViewOnce?: boolean} | null>(null);
  const [messageLimit, setMessageLimit] = useState(25);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const roomRef = useMemoFirebase(() => {
    if (!db || !conversationId) return null;
    return doc(db, 'chatRooms', conversationId);
  }, [db, conversationId]);
  const { data: room } = useDoc(roomRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !conversationId) return null;
    return query(
      collection(db, 'chatRooms', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limitToLast(messageLimit)
    );
  }, [db, conversationId, messageLimit]);
  const { data: messages } = useCollection(messagesQuery);

  const participantsQuery = useMemoFirebase(() => {
    if (!db || !room?.memberIds) return null;
    return query(collection(db, 'users'), where('id', 'in', room.memberIds));
  }, [db, room?.memberIds]);
  const { data: participants } = useCollection(participantsQuery);

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    if (messages && messages.length > 0 && isInitialLoad) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      setIsInitialLoad(false);
    } else if (messages && messages.length > 0 && !isInitialLoad) {
      // Only scroll to bottom if we were already near the bottom or it's a new message from ME
      const container = scrollContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
        const lastMsg = messages[messages.length - 1];
        if (isNearBottom || lastMsg.senderId === user?.uid) {
           messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [messages?.length, isInitialLoad, user?.uid]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!topSentinelRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && messages && messages.length >= messageLimit) {
        // User scrolled to top, load more
        setMessageLimit(prev => prev + 25);
      }
    }, { threshold: 0.1 });

    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [messages, messageLimit]);

  const updateTypingStatus = (isTyping: boolean) => {
    if (!roomRef || !user) return;
    updateDocumentNonBlocking(roomRef, {
      [`typing.${user.uid}`]: isTyping ? serverTimestamp() : deleteField()
    });
  };

  const handleSend = (type: 'text' | 'image' | 'view-once' = 'text', content?: string) => {
    const finalContent = content || inputValue.trim();
    if (!finalContent || !conversationId || !user) return;

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
      reactions: {}
    };

    if (replyingTo) {
      messageData.replyTo = replyingTo.id;
      messageData.replyToContent = replyingTo.content;
    }

    if (type === 'view-once') messageData.openedBy = [];

    addDocumentNonBlocking(collection(db, 'chatRooms', conversationId, 'messages'), messageData);
    updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId), {
      lastMessageText: type === 'image' ? 'Sent a photo' : type === 'view-once' ? 'Sent a Snap' : finalContent,
      lastMessageSenderId: user.uid,
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
    });
    
    setInputValue('');
    setReplyingTo(null);
    updateTypingStatus(false);
  };

  const handleReact = (msgId: string, emoji: string) => {
    if (!user) return;
    const msgRef = doc(db, 'chatRooms', conversationId!, 'messages', msgId);
    const msg = messages?.find(m => m.id === msgId);
    if (!msg) return;

    const reactions = { ...(msg.reactions || {}) };
    Object.keys(reactions).forEach(key => {
      reactions[key] = reactions[key].filter((uid: string) => uid !== user.uid);
      if (reactions[key].length === 0) delete reactions[key];
    });

    if (!msg.reactions?.[emoji]?.includes(user.uid)) {
      reactions[emoji] = [...(reactions[emoji] || []), user.uid];
    }
    updateDocumentNonBlocking(msgRef, { reactions });
  };

  const otherUser = useMemo(() => {
    if (!room || !participants || !user) return null;
    return participants.find(p => p.id !== user.uid);
  }, [room, participants, user]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-center p-8 animate-in-fade h-full">
        <div className="h-32 w-32 bg-muted/30 flex items-center justify-center rounded-[3rem] mb-8 border border-border/50">
          <MessageSquare className="h-14 w-14 text-muted-foreground/20" />
        </div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Choose a Friend</h2>
        <p className="text-muted-foreground mt-3 max-w-[240px] font-bold text-sm uppercase tracking-widest opacity-60">Send a Snap or text to start the conversation.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <header className="h-20 px-6 flex items-center justify-between border-b border-border/80 sticky top-0 z-30 bg-background/95 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-muted" onClick={onBack}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          <div className="flex flex-col">
            <h3 className="text-[17px] font-black uppercase tracking-tighter leading-none">{room?.isGroupChat ? room.name : otherUser?.username}</h3>
            <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] mt-1.5", otherUser?.onlineStatus ? "text-accent" : "text-muted-foreground opacity-50")}>
              {otherUser?.onlineStatus ? "Active Now" : "Away"}
            </span>
          </div>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-muted/80 border border-border/50 shadow-sm">
              <Info className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md bg-card/98 backdrop-blur-2xl border-l border-border/50 shadow-2xl p-0">
            <SheetHeader className="p-10 border-b border-border/50 bg-muted/20">
              <div className="flex flex-col items-center gap-6">
                <Avatar className="h-32 w-32 border-4 border-background shadow-2xl ring-4 ring-primary/20">
                  <AvatarImage src={room?.isGroupChat ? room.groupImageUrl : otherUser?.profilePictureUrl} />
                  <AvatarFallback className="text-4xl font-black bg-muted text-primary">{room?.name?.[0] || otherUser?.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center space-y-1">
                   <SheetTitle className="text-2xl font-black uppercase italic tracking-tighter">{room?.name || otherUser?.username}</SheetTitle>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Created {room?.createdAt?.toDate ? format(room.createdAt.toDate(), 'MMM yyyy') : ''}</p>
                </div>
              </div>
            </SheetHeader>
            
            <div className="p-8 space-y-8 h-full overflow-y-auto scrollbar-hide">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Privacy Settings</h4>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-[2rem] border border-border/50">
                  <div className="flex items-center gap-4">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest">Vanish Mode</span>
                  </div>
                  <Switch checked={room?.vanishMode} onCheckedChange={(v) => roomRef && updateDocumentNonBlocking(roomRef, { vanishMode: v })} />
                </div>
              </div>

              <div className="pt-8 border-t border-border/50">
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
                        This action cannot be undone. All messages will be permanently removed for you.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                      <AlertDialogAction className="rounded-xl bg-destructive font-black uppercase tracking-widest" onClick={() => {
                        messages?.forEach(m => deleteDocumentNonBlocking(doc(db, 'chatRooms', conversationId, 'messages', m.id)));
                        toast({ title: "Chat Deleted" });
                      }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-6 px-2 scrollbar-hide flex flex-col"
      >
        <div ref={topSentinelRef} className="h-1 w-full" />
        {messages?.map((msg) => (
          <MessageItem 
            key={msg.id}
            msg={msg}
            isMe={msg.senderId === user?.uid}
            sender={participants?.find(p => p.id === msg.senderId)}
            currentUserId={user?.uid}
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
            onReact={handleReact}
            onImageClick={(url: string, id?: string, viewOnce?: boolean) => {
              setLightboxImage({ url, id, isViewOnce: viewOnce });
              if (viewOnce && id && user) {
                const msgRef = doc(db, 'chatRooms', conversationId, 'messages', id);
                updateDocumentNonBlocking(msgRef, {
                  openedBy: Array.from(new Set([...(msg.openedBy || []), user.uid]))
                });
              }
            }}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-4 md:p-6 bg-background/95 backdrop-blur-xl border-t border-border/80 sticky bottom-0 z-30">
        <div className="max-w-4xl mx-auto space-y-4">
          {replyingTo && (
            <div className="px-6 py-3 bg-primary/10 rounded-[1.5rem] flex items-center justify-between border border-primary/20 animate-in slide-in-from-bottom-2">
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Replying</span>
                <p className="text-xs font-bold truncate opacity-80">{replyingTo.content}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/20" onClick={() => setReplyingTo(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {editingMessage && (
            <div className="px-6 py-3 bg-secondary/10 rounded-[1.5rem] flex items-center justify-between border border-secondary/20 animate-in slide-in-from-bottom-2">
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary">Editing Message</span>
                <p className="text-xs font-bold truncate opacity-80">{editingMessage.content}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-secondary/20" onClick={() => { setEditingMessage(null); setInputValue(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-4 bg-muted/60 rounded-[2.5rem] p-2 pl-3 border border-border shadow-inner focus-within:ring-4 ring-primary/10 transition-all">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="h-12 w-12 rounded-full flex items-center justify-center text-muted-foreground hover:bg-background hover:text-primary transition-all shadow-sm bg-background/80"
            >
              <Camera className="h-6 w-6" />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
               const file = e.target.files?.[0];
               if (file) {
                 const reader = new FileReader();
                 reader.onloadend = () => handleSend(isViewOnceEnabled ? 'view-once' : 'image', reader.result as string);
                 reader.readAsDataURL(file);
               }
            }} />
            
            <Textarea 
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); updateTypingStatus(e.target.value.length > 0); }}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Start a Chat..."
              className="bg-transparent border-none min-h-[44px] h-[44px] focus-visible:ring-0 text-[16px] font-bold resize-none py-2.5 px-2 placeholder:opacity-50"
            />

            <div className="flex items-center gap-2 pr-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-12 w-12 rounded-full transition-all", isViewOnceEnabled && "text-primary bg-primary/10")}
                onClick={() => setIsViewOnceEnabled(!isViewOnceEnabled)}
                title="View Once"
              >
                <Eye className="h-6 w-6" />
              </Button>
              <Button 
                onClick={() => handleSend()} 
                disabled={!inputValue.trim()}
                className="h-12 px-8 rounded-full bg-foreground text-background font-black uppercase tracking-widest text-[12px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                {editingMessage ? 'Update' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-full h-full p-0 border-none bg-black">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center p-6">
            {lightboxImage && <img src={lightboxImage.url} alt="Snap" className="max-w-full max-h-full object-contain rounded-[2rem] shadow-2xl" />}
            <Button variant="ghost" size="icon" className="absolute top-8 right-8 text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-xl h-14 w-14" onClick={() => setLightboxImage(null)}>
              <X className="h-8 w-8" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
