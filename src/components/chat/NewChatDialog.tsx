"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, UserPlus, Users, Loader2, X, Check } from 'lucide-react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, setDoc, addDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase';
import { cn } from '@/lib/utils';

interface NewChatDialogProps {
  onChatCreated: (id: string) => void;
}

export default function NewChatDialog({ onChatCreated }: NewChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  
  const { user: currentUser } = useUser();
  const db = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!db || !searchTerm || searchTerm.length < 2) return null;
    return query(
      collection(db, 'users'),
      where('username', '>=', searchTerm),
      where('username', '<=', searchTerm + '\uf8ff')
    );
  }, [db, searchTerm]);

  const { data: users, isLoading } = useCollection(usersQuery);

  const toggleUserSelection = (user: any) => {
    setSelectedUsers(prev => 
      prev.find(u => u.id === user.id) 
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const startPrivateChat = async (targetUser: any) => {
    if (!currentUser || !db) return;
    const roomId = [currentUser.uid, targetUser.id].sort().join('_');
    const roomRef = doc(db, 'chatRooms', roomId);

    const roomData = {
      id: roomId,
      name: targetUser.username,
      isGroupChat: false,
      memberIds: [currentUser.uid, targetUser.id],
      members: { [currentUser.uid]: true, [targetUser.id]: true },
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageText: 'New conversation started',
    };

    await setDoc(roomRef, roomData, { merge: true });
    onChatCreated(roomId);
    resetAndClose();
  };

  const createGroupChat = async () => {
    if (!currentUser || !db || selectedUsers.length === 0 || !groupName.trim()) return;

    const memberIds = [currentUser.uid, ...selectedUsers.map(u => u.id)];
    const membersMap = memberIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});

    const roomRef = await addDoc(collection(db, 'chatRooms'), {
      name: groupName,
      isGroupChat: true,
      memberIds: memberIds,
      members: membersMap,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageText: 'Group created',
    });

    onChatCreated(roomRef.id);
    resetAndClose();
  };

  const resetAndClose = () => {
    setOpen(false);
    setIsGroupMode(false);
    setSelectedUsers([]);
    setGroupName('');
    setSearchTerm('');
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
          <DialogTitle className="flex items-center gap-2">
            {isGroupMode ? <Users className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isGroupMode ? 'Create Group Chat' : 'Start a New Chat'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {!isGroupMode && (
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 border-dashed"
              onClick={() => setIsGroupMode(true)}
            >
              <Users className="h-4 w-4" />
              New Group Chat
            </Button>
          )}

          {isGroupMode && (
            <div className="space-y-2">
              <Input
                placeholder="Group Name (e.g. Design Team)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-muted/30 border-none"
              />
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 bg-muted/20 rounded-md">
                  {selectedUsers.map(u => (
                    <Badge key={u.id} variant="secondary" className="gap-1 px-2 py-1">
                      {u.username}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleUserSelection(u)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-muted/30 border-none"
            />
          </div>

          <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 scrollbar-hide">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : users?.filter(u => u.id !== currentUser?.uid)?.map((user) => (
              <div 
                key={user.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer",
                  isGroupMode && selectedUsers.find(u => u.id === user.id) ? "bg-primary/10" : "hover:bg-muted/30"
                )}
                onClick={() => isGroupMode ? toggleUserSelection(user) : startPrivateChat(user)}
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
                {isGroupMode ? (
                  <div className={cn(
                    "h-5 w-5 rounded-full border flex items-center justify-center transition-colors",
                    selectedUsers.find(u => u.id === user.id) ? "bg-primary border-primary" : "border-border"
                  )}>
                    {selectedUsers.find(u => u.id === user.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2">
          {isGroupMode && (
            <>
              <Button variant="ghost" onClick={() => setIsGroupMode(false)}>Back</Button>
              <Button 
                onClick={createGroupChat} 
                disabled={selectedUsers.length === 0 || !groupName.trim()}
                className="gap-2"
              >
                Create Group ({selectedUsers.length})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
