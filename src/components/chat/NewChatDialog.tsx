
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Users, Loader2, X, Check, QrCode, Scan } from 'lucide-react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface NewChatDialogProps {
  onChatCreated: (id: string) => void;
}

export default function NewChatDialog({ onChatCreated }: NewChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [isQrSearch, setIsQrSearch] = useState(false);
  const [qrId, setQrId] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  
  const { user: currentUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => {
    if (!db || !searchTerm || searchTerm.length < 2) return null;
    const lowerSearch = searchTerm.toLowerCase();
    return query(
      collection(db, 'users'),
      where('usernameLowercase', '>=', lowerSearch),
      where('usernameLowercase', '<=', lowerSearch + '\uf8ff')
    );
  }, [db, searchTerm]);

  const { data: users, isLoading } = useCollection(usersQuery);

  const startPrivateChat = (targetUser: any) => {
    if (!currentUser || !db) return;
    const roomId = [currentUser.uid, targetUser.id].sort().join('_');
    const roomRef = doc(db, 'chatRooms', roomId);

    const roomData = {
      id: roomId,
      name: targetUser.username,
      nameLowercase: targetUser.username.toLowerCase(),
      isGroupChat: false,
      memberIds: [currentUser.uid, targetUser.id],
      members: { [currentUser.uid]: true, [targetUser.id]: true },
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageText: 'New conversation started',
    };

    setDocumentNonBlocking(roomRef, roomData, { merge: true });
    onChatCreated(roomId);
    resetAndClose();
  };

  const handleQrAdd = async () => {
    if (!db || !qrId.trim() || !currentUser) return;
    const userRef = doc(db, 'users', qrId.trim());
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      startPrivateChat({ id: snap.id, ...snap.data() });
    } else {
      toast({ variant: "destructive", title: "Invalid ID", description: "User not found." });
    }
  };

  const createGroupChat = () => {
    if (!currentUser || !db || selectedUsers.length === 0 || !groupName.trim()) return;
    const memberIds = [currentUser.uid, ...selectedUsers.map(u => u.id)];
    const membersMap = memberIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});

    const roomData = {
      name: groupName,
      nameLowercase: groupName.toLowerCase(),
      isGroupChat: true,
      memberIds: memberIds,
      members: membersMap,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageText: 'Group created',
    };

    addDocumentNonBlocking(collection(db, 'chatRooms'), roomData).then((docRef) => {
      if (docRef) {
        onChatCreated(docRef.id);
        resetAndClose();
      }
    });
  };

  const resetAndClose = () => {
    setOpen(false);
    setIsGroupMode(false);
    setIsQrSearch(false);
    setSelectedUsers([]);
    setGroupName('');
    setSearchTerm('');
    setQrId('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-none rounded-[2.5rem] p-8 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter italic">
            {isGroupMode ? <Users className="h-6 w-6 text-primary" /> : isQrSearch ? <Scan className="h-6 w-6 text-accent" /> : <Plus className="h-6 w-6 text-primary" />}
            {isGroupMode ? 'Create Group' : isQrSearch ? 'Scan ID' : 'New Chat'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-6">
          {!isGroupMode && !isQrSearch && (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-14 rounded-2xl border-dashed gap-2" onClick={() => setIsGroupMode(true)}>
                <Users className="h-4 w-4" /> Group
              </Button>
              <Button variant="outline" className="h-14 rounded-2xl border-dashed gap-2" onClick={() => setIsQrSearch(true)}>
                <QrCode className="h-4 w-4" /> QR/ID
              </Button>
            </div>
          )}

          {isQrSearch ? (
            <div className="space-y-4 animate-in zoom-in-95">
              <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Scan className="h-8 w-8 text-primary" />
                </div>
                <p className="text-[10px] text-center uppercase tracking-widest font-bold text-muted-foreground leading-relaxed px-4">
                  Enter the unique User ID shared by your friend via QR code.
                </p>
                <Input 
                  placeholder="Paste User ID here..." 
                  value={qrId} 
                  onChange={(e) => setQrId(e.target.value)} 
                  className="bg-background border-none h-12 rounded-xl text-center"
                />
                <Button className="w-full h-12 rounded-xl bg-primary font-bold shadow-lg shadow-primary/20" onClick={handleQrAdd}>
                  Add Contact
                </Button>
                <Button variant="ghost" className="h-8 text-[10px] uppercase font-bold tracking-widest" onClick={() => setIsQrSearch(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isGroupMode && (
                <Input placeholder="Group Name..." value={groupName} onChange={(e) => setGroupName(e.target.value)} className="bg-white/5 border-none h-14 rounded-2xl px-5" />
              )}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search username..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 bg-white/5 border-none h-14 rounded-2xl" />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : users?.filter(u => u.id !== currentUser?.uid)?.map((user) => (
                  <div key={user.id} className={cn("flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer", isGroupMode && selectedUsers.find(u => u.id === user.id) ? "bg-primary/10" : "hover:bg-white/5")} onClick={() => isGroupMode ? (selectedUsers.find(u => u.id === user.id) ? setSelectedUsers(s => s.filter(u_ => u_.id !== user.id)) : setSelectedUsers(s => [...s, user])) : startPrivateChat(user)}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Avatar className="h-10 w-10 shrink-0"><AvatarImage src={user.profilePictureUrl || undefined} /><AvatarFallback>{user.username?.[0]}</AvatarFallback></Avatar>
                      <div className="flex flex-col overflow-hidden"><span className="text-sm font-bold">{user.username}</span>{user.bio && <span className="text-[10px] text-muted-foreground truncate italic">{user.bio}</span>}</div>
                    </div>
                    {isGroupMode && <div className={cn("h-5 w-5 rounded-full border flex items-center justify-center transition-colors", selectedUsers.find(u => u.id === user.id) ? "bg-primary border-primary" : "border-white/10")}>{selectedUsers.find(u => u.id === user.id) && <Check className="h-3 w-3 text-white" />}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {isGroupMode && (
          <DialogFooter className="flex sm:justify-between items-center gap-2">
            <Button variant="ghost" onClick={() => setIsGroupMode(false)}>Back</Button>
            <Button onClick={createGroupChat} disabled={selectedUsers.length === 0 || !groupName.trim()} className="gap-2 h-12 rounded-xl bg-primary font-bold shadow-lg shadow-primary/20">Create ({selectedUsers.length})</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
