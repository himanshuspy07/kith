
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, UserPlus, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase';

interface NewChatDialogProps {
  onChatCreated: (id: string) => void;
}

export default function NewChatDialog({ onChatCreated }: NewChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user: currentUser } = useUser();
  const db = useFirestore();

  // Search for users
  const usersQuery = useMemoFirebase(() => {
    if (!db || !searchTerm || searchTerm.length < 2) return null;
    return query(
      collection(db, 'users'),
      where('username', '>=', searchTerm),
      where('username', '<=', searchTerm + '\uf8ff')
    );
  }, [db, searchTerm]);

  const { data: users, isLoading } = useCollection(usersQuery);

  const startPrivateChat = async (targetUser: any) => {
    if (!currentUser || !db) return;

    // Create a deterministic room ID for 1:1 chats to prevent duplicates
    const roomId = [currentUser.uid, targetUser.id].sort().join('_');
    const roomRef = doc(db, 'chatRooms', roomId);

    const roomData = {
      id: roomId,
      name: `${targetUser.username}`,
      isGroupChat: false,
      memberIds: [currentUser.uid, targetUser.id],
      members: {
        [currentUser.uid]: true,
        [targetUser.id]: true
      },
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageText: 'New conversation started',
    };

    // Use setDoc to handle the deterministic ID
    try {
      await setDoc(roomRef, roomData, { merge: true });
      onChatCreated(roomId);
      setOpen(false);
    } catch (e) {
      console.error("Error creating chat room:", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Start a New Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-muted/30 border-none"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : users?.filter(u => u.id !== currentUser?.uid)?.map((user) => (
              <div 
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profilePictureUrl} />
                    <AvatarFallback>{user.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.username}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => startPrivateChat(user)}
                  className="h-8 gap-2"
                >
                  <UserPlus className="h-3 w-3" />
                  Chat
                </Button>
              </div>
            ))}
            {searchTerm.length >= 2 && users?.length === 0 && !isLoading && (
              <p className="text-center text-sm text-muted-foreground py-8">No users found.</p>
            )}
            {searchTerm.length < 2 && (
              <p className="text-center text-sm text-muted-foreground py-8">Type at least 2 characters to search.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
