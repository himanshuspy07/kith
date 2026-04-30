
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, LogOut, MessageSquare, Settings, User, Upload, Loader2, Moon, Sun, Pin, PinOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useDoc, useUser, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteField, serverTimestamp } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import NewChatDialog from './NewChatDialog';
import { useToast } from '@/hooks/use-toast';

interface SidebarProps {
  onSelectConversation: (id: string) => void;
  selectedConversationId?: string;
  className?: string;
}

export default function Sidebar({ onSelectConversation, selectedConversationId, className }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [newUsername, setNewUsername] = useState('');
  const [newAvatar, setNewAvatar] = useState('');

  // Stabilize time for hydration
  useEffect(() => {
    setCurrentTime(Date.now());
    const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const currentUserRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: currentUserProfile } = useDoc(currentUserRef);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const roomsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'chatRooms'),
      where(`members.${user.uid}`, '==', true)
    );
  }, [db, user?.uid]);

  const { data: rooms, isLoading } = useCollection(roomsQuery);

  const allUsersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'users');
  }, [db]);
  const { data: allUsers } = useCollection(allUsersQuery);

  const conversationListData = useMemo(() => {
    if (!rooms) return [];
    
    const mapped = rooms.map(room => {
      let displayName = room.name || 'Chat';
      let displayAvatar = null;
      let otherUserProfile = null;

      if (!room.isGroupChat && allUsers && user) {
        const otherUserId = room.memberIds?.find((id: string) => id !== user.uid);
        otherUserProfile = allUsers.find(u => u.id === otherUserId);
        if (otherUserProfile) {
          displayName = otherUserProfile.username;
          displayAvatar = otherUserProfile.profilePictureUrl;
        }
      }

      const isPinned = room.pinnedBy?.[user?.uid || ''] === true;

      return {
        ...room,
        displayName,
        displayAvatar,
        otherUserProfile,
        isPinned
      };
    });

    return mapped.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const timeA = a.updatedAt?.toDate?.()?.getTime() || 0;
      const timeB = b.updatedAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
  }, [rooms, allUsers, user]);

  const filteredConversations = conversationListData.filter(room => {
    return room.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleUpdateProfile = async () => {
    if (!user || !db || !currentUserRef) return;
    
    const updates: any = {
      updatedAt: serverTimestamp()
    };

    if (newUsername.trim()) {
      updates.username = newUsername.trim();
      try {
        await updateProfile(user, { displayName: newUsername.trim() });
      } catch (e) {
        // Handled silently
      }
    }

    if (newAvatar) {
      updates.profilePictureUrl = newAvatar;
    }

    updateDocumentNonBlocking(currentUserRef, updates);
    setIsSettingsOpen(false);
    toast({ title: "Profile updated" });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Limit is 1MB." });
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewAvatar(reader.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const togglePin = (e: React.MouseEvent, roomId: string, currentlyPinned: boolean) => {
    e.stopPropagation();
    if (!db || !user) return;
    const roomRef = doc(db, 'chatRooms', roomId);
    updateDocumentNonBlocking(roomRef, {
      [`pinnedBy.${user.uid}`]: currentlyPinned ? deleteField() : true
    });
  };

  const getRoomTyping = (room: any) => {
    if (!room.typing || !currentTime) return null;
    return Object.entries(room.typing).find(([uid, ts]: [string, any]) => {
      if (uid === user?.uid) return false;
      const timestamp = ts?.toDate?.()?.getTime() || 0;
      return (currentTime - timestamp) < 4000;
    });
  };

  return (
    <div className={cn("h-full border-r border-border flex flex-col bg-background/50 backdrop-blur-sm shrink-0", className)}>
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-primary/20">
            <AvatarImage src={currentUserProfile?.profilePictureUrl || undefined} />
            <AvatarFallback>{currentUserProfile?.username?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="font-semibold text-sm truncate max-w-[120px]">{currentUserProfile?.username || 'Kith'}</span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{user?.email}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => signOut(auth)}>
            <LogOut className="h-4 w-4" />
          </Button>
          <Dialog open={isSettingsOpen} onOpenChange={(open) => {
            setIsSettingsOpen(open);
            if (open && currentUserProfile) {
              setNewUsername(currentUserProfile.username || '');
              setNewAvatar(currentUserProfile.profilePictureUrl || '');
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-md w-[90%] rounded-xl">
              <DialogHeader><DialogTitle>Profile Settings</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center gap-4 mb-4">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 border-2 border-primary/20">
                      <AvatarImage src={newAvatar || currentUserProfile?.profilePictureUrl || undefined} />
                      <AvatarFallback className="text-2xl font-bold">{user?.email?.[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="set-username">Display Name</Label>
                  <Input id="set-username" placeholder="Enter new username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="bg-muted/30 border-none h-11" />
                </div>
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-sm font-medium">Appearance</span>
                  <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2 h-10 px-4">
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </Button>
                </div>
              </div>
              <DialogFooter><Button onClick={handleUpdateProfile} disabled={isUploading} className="w-full h-11">Save Changes</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <NewChatDialog onChatCreated={onSelectConversation} />
        </div>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search conversations..." className="pl-9 h-11 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-3 items-center animate-pulse">
                <div className="h-12 w-12 bg-muted rounded-full" />
                <div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded w-1/2" /><div className="h-3 bg-muted rounded w-3/4" /></div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center gap-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground opacity-20" />
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
          </div>
        ) : (
          filteredConversations.map((room) => {
            const isSelected = selectedConversationId === room.id;
            const updatedAt = room.updatedAt?.toDate?.() || (currentTime ? new Date(currentTime) : null);
            const isUnread = room.lastMessageText && room.lastMessageSenderId !== user?.uid && (!room.readBy?.includes(user?.uid));
            const typingUser = getRoomTyping(room);
            
            let presenceText = '';
            if (!room.isGroupChat && room.otherUserProfile) {
              const lastActive = room.otherUserProfile.lastActiveAt?.toDate?.() || new Date(room.otherUserProfile.lastActiveAt || currentTime || Date.now());
              const isOnline = room.otherUserProfile.onlineStatus && (currentTime && (currentTime - lastActive.getTime() < 120000));
              presenceText = isOnline ? 'Online' : (currentTime ? `Seen ${formatDistanceToNow(lastActive)} ago` : 'Offline');
            } else if (room.isGroupChat) {
              presenceText = `${room.memberIds?.length || 0} members`;
            }

            return (
              <div
                key={room.id}
                onClick={() => onSelectConversation(room.id)}
                className={cn(
                  "w-full p-4 flex items-start gap-3 transition-colors hover:bg-muted/20 text-left relative group cursor-pointer border-b border-border/10",
                  isSelected && "bg-muted/40"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 border border-border/50">
                    {room.displayAvatar && <AvatarImage src={room.displayAvatar} />}
                    <AvatarFallback>{room.displayName?.[0] || 'C'}</AvatarFallback>
                  </Avatar>
                  {isUnread && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full border-2 border-background shadow-sm" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={cn("text-sm truncate pr-2", isUnread ? "font-bold" : "font-medium")}>
                      {room.displayName}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {room.isPinned && <Pin className="h-3 w-3 text-primary fill-primary" />}
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {updatedAt ? formatDistanceToNow(updatedAt, { addSuffix: false }) : '--'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center overflow-hidden">
                    {typingUser ? (
                      <p className="text-xs text-accent animate-pulse font-bold tracking-tight">Typing...</p>
                    ) : (
                      <p className={cn("text-xs truncate max-w-[140px]", isUnread ? "text-foreground font-medium" : "text-muted-foreground italic")}>
                        {room.lastMessageText || 'No messages yet'}
                      </p>
                    )}
                    <span className="text-[9px] text-muted-foreground opacity-60 uppercase font-medium tracking-tighter whitespace-nowrap ml-2">
                      {presenceText}
                    </span>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-6 w-6 rounded-full absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity",
                    room.isPinned ? "text-primary opacity-100" : "text-muted-foreground"
                  )}
                  onClick={(e) => togglePin(e, room.id, room.isPinned)}
                >
                  {room.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </Button>

                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
