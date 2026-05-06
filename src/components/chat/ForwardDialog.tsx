"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, Loader2, Check } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, serverTimestamp, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageToForward: any;
}

export default function ForwardDialog({ open, onOpenChange, messageToForward }: ForwardDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [forwardingTo, setForwardingTo] = useState<string | null>(null);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const roomsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'chatRooms'), where(`members.${user.uid}`, '==', true));
  }, [db, user?.uid]);
  
  const { data: rooms, isLoading } = useCollection(roomsQuery);

  const filteredRooms = rooms?.filter(room => {
    const name = room.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const handleForward = (roomId: string) => {
    if (!user || !db || !messageToForward) return;
    setForwardingTo(roomId);

    const messageData = {
      chatRoomId: roomId,
      senderId: user.uid,
      content: messageToForward.content,
      type: messageToForward.type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
      isDeleted: false,
      isEdited: false,
      forwardedFrom: messageToForward.senderId
    };

    addDocumentNonBlocking(collection(db, 'chatRooms', roomId, 'messages'), messageData);
    updateDocumentNonBlocking(doc(db, 'chatRooms', roomId), {
      lastMessageText: `Forwarded: ${messageToForward.type === 'image' ? 'a photo' : messageToForward.content}`,
      lastMessageSenderId: user.uid,
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
    });

    toast({
      title: "Message Forwarded",
      description: "Successfully sent to the conversation.",
    });

    setTimeout(() => {
      setForwardingTo(null);
      onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold">Forward Message</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search conversations..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-black/5 dark:bg-white/5 border-none h-12 rounded-xl"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1 scrollbar-hide">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : filteredRooms.map((room) => (
              <div 
                key={room.id}
                className="flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl cursor-pointer transition-colors"
                onClick={() => handleForward(room.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={room.groupImageUrl || undefined} />
                    <AvatarFallback>{room.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-bold text-sm">{room.name || 'Group Chat'}</span>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full">
                  {forwardingTo === room.id ? <Check className="h-4 w-4 text-accent" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
