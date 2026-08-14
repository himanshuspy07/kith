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
  Clock
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
      "flex flex-col animate-in-fade px-4 py-2 group", 
      isMe ? "items-start" : "items-start"
    )}>
      <div className="flex items-start gap-3 max-w-full">
        <Avatar className="h-9 w-9 mt-1">
          <AvatarImage src={sender?.profilePictureUrl} className="object-cover" />
          <AvatarFallback className="bg-muted text-[10px] font-bold">{sender?.username?.[0]}</AvatarFallback>
        </Avatar>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={cn("text-[13px] font-black uppercase tracking-tighter", isMe ? "text-secondary" : "text-primary")}>
              {isMe ? "ME" : sender?.username}
            </span>
            <span className="text-[10px] text-muted-foreground font-bold">{timeStr}</span>
          </div>

          <div className="relative mt-1">
            {isViewOnce ? (
              <div 
                onClick={() => !isOpened && onImageClick(msg.content, msg.id, true)}
                className="flex items-center gap-2 py-1 cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  {isOpened ? <EyeOff className="h-4 w-4 opacity-40" /> : <Eye className="h-4 w-4 text-secondary" />}
                </div>
                <span className="text-sm font-bold">{isOpened ? "Opened" : "New Photo"}</span>
              </div>
            ) : msg.type === 'image' ? (
              <img 
                src={msg.content} 
                alt="Shared" 
                className="rounded-lg max-w-[240px] h-auto object-cover mt-1 cursor-zoom-in" 
                onClick={() => onImageClick(msg.content)}
              />
            ) : (
              <p className={cn("text-[15px] font-medium leading-snug break-words", msg.isDeleted && "italic opacity-50")}>
                {msg.content}
              </p>
            )}

            {/* Meta status */}
            {isMe && !msg.isDeleted && (
              <div className="flex items-center gap-1 mt-1 opacity-40">
                {isReadByOthers ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                <span className="text-[9px] font-bold uppercase tracking-widest">{isReadByOthers ? "Opened" : "Delivered"}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Actions Hidden by default */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-4 mt-2 ml-12 transition-opacity">
        <button onClick={() => onAction('reply', msg)} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">Reply</button>
        {isMe && <button onClick={() => onAction('edit', msg)} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">Edit</button>}
        <button onClick={() => onAction('delete', msg)} className="text-[10px] font-black uppercase tracking-widest text-destructive/60 hover:text-destructive">Delete</button>
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

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !conversationId) return null;
    return query(
      collection(db, 'chatRooms', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limitToLast(50)
    );
  }, [db, conversationId]);
  const { data: messages } = useCollection(messagesQuery);

  const participantsQuery = useMemoFirebase(() => {
    if (!db || !room?.memberIds) return null;
    return query(collection(db, 'users'), where('id', 'in', room.memberIds));
  }, [db, room?.memberIds]);
  const { data: participants } = useCollection(participantsQuery);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length]);

  const updateTypingStatus = (isTyping: boolean) => {
    if (!roomRef || !user) return;
    updateDocumentNonBlocking(roomRef, {
      [`typing.${user.uid}`]: isTyping ? serverTimestamp() : deleteField()
    });
  };

  const handleSend = (type: 'text' | 'image' | 'view-once' = 'text', content?: string) => {
    const finalContent = content || inputValue.trim();
    if (!finalContent || !conversationId || !user) return;

    const messageData: any = {
      chatRoomId: conversationId,
      senderId: user.uid,
      content: finalContent,
      type: type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
      isDeleted: false,
    };

    if (type === 'view-once') messageData.openedBy = [];

    addDocumentNonBlocking(collection(db, 'chatRooms', conversationId, 'messages'), messageData);
    updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId), {
      lastMessageText: type === 'image' ? 'Sent a photo' : type === 'view-once' ? 'Sent a Snap' : finalContent,
      lastMessageSenderId: user.uid,
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
    });
    setInputValue('');
    updateTypingStatus(false);
  };

  const otherUser = useMemo(() => {
    if (!room || !participants || !user) return null;
    return participants.find(p => p.id !== user.uid);
  }, [room, participants, user]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-center p-8">
        <div className="h-24 w-24 bg-primary flex items-center justify-center rounded-[2rem] mb-6">
          <Send className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Choose a Friend</h2>
        <p className="text-muted-foreground mt-2 max-w-xs font-bold text-sm">Send a Snap or text to start the conversation.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <header className="h-20 px-6 flex items-center justify-between border-b border-border acrylic sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={onBack}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex flex-col">
            <h3 className="text-lg font-black uppercase tracking-tighter leading-none">{room?.isGroupChat ? room.name : otherUser?.username}</h3>
            <span className="text-[11px] text-secondary font-black uppercase tracking-widest mt-1">Chatting</span>
          </div>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-muted">
              <Info className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md acrylic">
            <SheetHeader className="p-6">
              <SheetTitle className="sr-only">Chat Details</SheetTitle>
              <div className="flex flex-col items-center gap-6">
                <Avatar className="h-32 w-32 border-4 border-white/10 shadow-2xl">
                  <AvatarImage src={room?.isGroupChat ? room.groupImageUrl : otherUser?.profilePictureUrl} />
                  <AvatarFallback className="text-4xl font-bold">{room?.name?.[0]}</AvatarFallback>
                </Avatar>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">{room?.name || otherUser?.username}</h3>
              </div>
            </SheetHeader>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-3xl">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-bold uppercase tracking-widest">Vanish Mode</span>
                </div>
                <Switch checked={room?.vanishMode} onCheckedChange={(v) => roomRef && updateDocumentNonBlocking(roomRef, { vanishMode: v })} />
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full h-14 rounded-3xl font-black uppercase tracking-widest">Clear Conversation</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl border-none">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold">Clear Chat?</AlertDialogTitle>
                    <AlertDialogDescription>All messages will be removed from your history.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction className="rounded-xl bg-destructive" onClick={() => roomRef && deleteDocumentNonBlocking(roomRef)}>Clear</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex-1 overflow-y-auto py-6 scrollbar-hide">
        {messages?.map((msg) => (
          <MessageItem 
            key={msg.id}
            msg={msg}
            isMe={msg.senderId === user?.uid}
            sender={participants?.find(p => p.id === msg.senderId)}
            onAction={(action: string, m: any) => {
               if (action === 'delete') deleteDocumentNonBlocking(doc(db, 'chatRooms', conversationId, 'messages', m.id));
               if (action === 'reply') setReplyingTo(m);
            }}
            onImageClick={(url: string, id?: string, viewOnce?: boolean) => {
              setLightboxImage({ url, id, isViewOnce: viewOnce });
              if (viewOnce && id && user) {
                updateDocumentNonBlocking(doc(db, 'chatRooms', conversationId, 'messages', id), {
                  openedBy: Array.from(new Set([...(msg.openedBy || []), user.uid]))
                });
              }
            }}
            currentUserId={user?.uid}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-4 bg-background z-10">
        <div className="max-w-5xl mx-auto flex flex-col gap-2">
          {replyingTo && (
            <div className="px-4 py-2 bg-muted rounded-2xl flex items-center justify-between border-l-4 border-secondary">
              <span className="text-xs font-bold truncate">Replying: {replyingTo.content}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}><X className="h-4 w-4" /></Button>
            </div>
          )}

          <div className="flex items-center gap-3 bg-muted rounded-full p-1 border border-border/50">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-background transition-all"
            >
              <Camera className="h-5 w-5" />
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
              placeholder="Send a Chat"
              className="bg-transparent border-none min-h-[40px] h-[40px] focus-visible:ring-0 text-[16px] font-bold resize-none py-2 px-1"
            />

            <div className="flex items-center gap-1 pr-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-10 w-10 rounded-full", isViewOnceEnabled && "text-secondary")}
                onClick={() => setIsViewOnceEnabled(!isViewOnceEnabled)}
              >
                <Eye className="h-5 w-5" />
              </Button>
              <Button 
                onClick={() => handleSend()} 
                disabled={!inputValue.trim()}
                className="h-10 px-6 rounded-full bg-secondary hover:bg-secondary/90 font-black uppercase tracking-widest text-[11px]"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-full h-full p-0 border-none bg-black">
          <DialogHeader className="sr-only"><DialogTitle>Snap Preview</DialogTitle></DialogHeader>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {lightboxImage && <img src={lightboxImage.url} alt="Snap" className="max-w-full max-h-full object-contain rounded-xl" />}
            <Button variant="ghost" size="icon" className="absolute top-6 right-6 text-white bg-white/10 rounded-full" onClick={() => setLightboxImage(null)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
