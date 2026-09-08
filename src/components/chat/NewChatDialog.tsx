"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Users, Loader2, X, Check, QrCode, Scan, MessageCircle, UserPlus } from 'lucide-react';
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
    setSelectedUsers([]);
    setGroupName('');
    setSearchTerm('');
    setQrId('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary transition-all">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-none rounded-[3rem] p-0 shadow-2xl overflow-hidden">
        <Tabs defaultValue="chat" className="w-full">
          <div className="bg-muted/30 p-6 pb-0">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">Start Something</DialogTitle>
            </DialogHeader>
            <TabsList className="grid w-full grid-cols-2 rounded-2xl h-12 bg-black/10">
              <TabsTrigger value="chat" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase tracking-widest text-[10px] gap-2">
                <MessageCircle className="h-3.5 w-3.5" /> Chat
              </TabsTrigger>
              <TabsTrigger value="group" className="rounded-xl data-[state=active]:bg-secondary data-[state=active]:text-white font-bold uppercase tracking-widest text-[10px] gap-2">
                <Users className="h-3.5 w-3.5" /> Group
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="chat" className="mt-0 space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input placeholder="Search username..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 bg-muted border-none h-14 rounded-2xl font-bold" />
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                  {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
                  ) : users?.filter(u => u.id !== currentUser?.uid)?.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 transition-all cursor-pointer group" onClick={() => startPrivateChat(user)}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Avatar className="h-10 w-10 shrink-0 shadow-sm">
                          <AvatarImage src={user.profilePictureUrl || undefined} />
                          <AvatarFallback className="font-bold">{user.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-black uppercase tracking-tight">{user.username}</span>
                          {user.bio && <span className="text-[10px] text-muted-foreground truncate opacity-70 italic">{user.bio}</span>}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  ))}
                  {searchTerm.length >= 2 && users?.length === 0 && !isLoading && (
                    <div className="text-center py-10 opacity-40">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">No friends found</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-3 ml-2">Quick Add via ID</p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter User ID..." 
                    value={qrId} 
                    onChange={(e) => setQrId(e.target.value)} 
                    className="bg-muted border-none h-12 rounded-xl text-xs font-mono"
                  />
                  <Button size="icon" onClick={handleQrAdd} className="h-12 w-12 shrink-0 rounded-xl bg-accent text-white shadow-lg shadow-accent/20">
                    <UserPlus className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="group" className="mt-0 space-y-6">
              <div className="space-y-4">
                <Input placeholder="Group Name..." value={groupName} onChange={(e) => setGroupName(e.target.value)} className="bg-muted border-none h-14 rounded-2xl px-5 font-black uppercase tracking-tight text-lg" />
                
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Add participants..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 bg-muted border-none h-12 rounded-xl" />
                </div>

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 py-2">
                    {selectedUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-full bg-primary/10 border border-primary/20 animate-in zoom-in-95">
                        <Avatar className="h-5 w-5"><AvatarImage src={u.profilePictureUrl} /><AvatarFallback>{u.username?.[0]}</AvatarFallback></Avatar>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{u.username}</span>
                        <button onClick={() => setSelectedUsers(s => s.filter(u_ => u_.id !== u.id))} className="h-4 w-4 rounded-full hover:bg-primary/20 flex items-center justify-center">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                  {users?.filter(u => u.id !== currentUser?.uid)?.map((user) => (
                    <div key={user.id} className={cn("flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer", selectedUsers.find(u => u.id === user.id) ? "bg-secondary/10 border border-secondary/20" : "hover:bg-muted/50")} onClick={() => selectedUsers.find(u => u.id === user.id) ? setSelectedUsers(s => s.filter(u_ => u_.id !== user.id)) : setSelectedUsers(s => [...s, user])}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10"><AvatarImage src={user.profilePictureUrl} /><AvatarFallback>{user.username?.[0]}</AvatarFallback></Avatar>
                        <span className="text-sm font-bold">{user.username}</span>
                      </div>
                      <div className={cn("h-5 w-5 rounded-full border flex items-center justify-center transition-colors", selectedUsers.find(u => u.id === user.id) ? "bg-secondary border-secondary" : "border-muted-foreground/30")}>
                        {selectedUsers.find(u => u.id === user.id) && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button onClick={createGroupChat} disabled={selectedUsers.length === 0 || !groupName.trim()} className="w-full h-14 rounded-2xl bg-secondary text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all">
                Create Group ({selectedUsers.length})
              </Button>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
