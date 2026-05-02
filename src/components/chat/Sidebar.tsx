
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, LogOut, MessageSquare, Settings, User, Upload, Loader2, Moon, Sun, Pin, PinOff, Bell, BellRing, MoreVertical, Trash2, TextQuote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useDoc, useUser, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteField, serverTimestamp } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [newUsername, setNewUsername] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [newBio, setNewBio] = useState('');

  useEffect(() => {
    setCurrentTime(Date.now());
    const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
    
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
    
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

  const handleRequestNotifications = async () => {
    if (!("Notification" in window)) {
      toast({ variant: "destructive", title: "Not Supported", description: "Your browser does not support notifications." });
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast({ title: "Notifications Enabled", description: "You will now receive alerts for new messages." });
        new Notification("kith", { body: "Notifications are now active!", icon: "/icon.svg" });
      } else {
        toast({ variant: "destructive", title: "Permission Denied", description: "Notifications are blocked by your browser settings." });
      }
    } catch (e) {
      console.error("Notification request failed:", e);
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

  const participantIds = useMemo(() => {
    if (!rooms || !user) return [];
    const ids = new Set<string>();
    rooms.forEach(room => {
      room.memberIds?.forEach((id: string) => {
        if (id !== user.uid) ids.add(id);
      });
    });
    return Array.from(ids).slice(0, 30);
  }, [rooms, user]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || participantIds.length === 0) return null;
    return query(collection(db, 'users'), where('id', 'in', participantIds));
  }, [db, participantIds]);
  const { data: participantProfiles } = useCollection(usersQuery);

  const conversationListData = useMemo(() => {
    if (!rooms) return [];
    
    const mapped = rooms.map(room => {
      let displayName = room.name || 'Chat';
      let displayAvatar = null;
      let otherUserProfile = null;

      if (!room.isGroupChat && participantProfiles && user) {
        const otherUserId = room.memberIds?.find((id: string) => id !== user.uid);
        otherUserProfile = participantProfiles.find(u => u.id === otherUserId);
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
  }, [rooms, participantProfiles, user]);

  const filteredConversations = conversationListData.filter(room => {
    return (room.displayName || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleUpdateProfile = async () => {
    if (!user || !db || !currentUserRef) return;
    
    const updates: any = {
      updatedAt: serverTimestamp(),
      bio: newBio.trim()
    };

    if (newUsername.trim()) {
      updates.username = newUsername.trim();
      updates.usernameLowercase = newUsername.trim().toLowerCase();
      try {
        await updateProfile(user, { displayName: newUsername.trim() });
      } catch (e) {}
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

  const handleDeleteConversation = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (!db || !user) return;
    const roomRef = doc(db, 'chatRooms', roomId);
    deleteDocumentNonBlocking(roomRef);
    if (selectedConversationId === roomId) {
      onSelectConversation('');
    }
    toast({ title: "Conversation deleted" });
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
    <div className={cn("h-full border-r border-white/5 flex flex-col bg-background/80 backdrop-blur-xl shrink-0 z-30", className)}>
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-primary/20 shadow-lg">
            <AvatarImage src={currentUserProfile?.profilePictureUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">{currentUserProfile?.username?.[0] || 'k'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-sm tracking-tight truncate max-w-[120px]">{currentUserProfile?.username || 'kith'}</span>
            <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest truncate max-w-[120px]">Profile</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => signOut(auth)}>
            <LogOut className="h-4 w-4" />
          </Button>
          <Dialog open={isSettingsOpen} onOpenChange={(open) => {
            setIsSettingsOpen(open);
            if (open && currentUserProfile) {
              setNewUsername(currentUserProfile.username || '');
              setNewAvatar(currentUserProfile.profilePictureUrl || '');
              setNewBio(currentUserProfile.bio || '');
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:bg-white/5 rounded-full">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-2xl border-white/10 sm:max-w-md w-[90%] rounded-2xl shadow-2xl">
              <DialogHeader><DialogTitle className="text-xl font-bold tracking-tight">Profile Settings</DialogTitle></DialogHeader>
              <div className="space-y-6 py-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-28 w-28 border-2 border-primary/30 shadow-2xl">
                      <AvatarImage src={newAvatar || currentUserProfile?.profilePictureUrl || undefined} />
                      <AvatarFallback className="text-3xl font-bold bg-muted">{user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 h-9 w-9 rounded-full shadow-xl bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Display Name</Label>
                    <Input placeholder="Enter your name" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="bg-white/5 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/40" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Bio</Label>
                    <Textarea 
                      placeholder="Share a short professional bio..." 
                      value={newBio} 
                      onChange={(e) => setNewBio(e.target.value)} 
                      className="bg-white/5 border-none min-h-[100px] rounded-xl focus-visible:ring-1 focus-visible:ring-primary/40 resize-none" 
                      maxLength={150}
                    />
                    <p className="text-[9px] text-right text-muted-foreground/40">{newBio.length}/150</p>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <Label className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">Preferences</Label>
                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl">
                    <span className="text-sm font-medium">Dark Mode</span>
                    <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-9 w-9 rounded-full">
                      {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl">
                    <span className="text-sm font-medium">Notifications</span>
                    <Button 
                      variant="ghost"
                      size="sm" 
                      onClick={handleRequestNotifications} 
                      className={cn("h-9 px-4 rounded-full text-xs font-bold", notificationPermission === 'granted' ? "text-accent bg-accent/10" : "text-muted-foreground bg-white/5")}
                    >
                      {notificationPermission === 'granted' ? 'Enabled' : 'Enable'}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter><Button onClick={handleUpdateProfile} disabled={isUploading} className="w-full h-12 rounded-xl font-bold shadow-lg">Save Changes</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <NewChatDialog onChatCreated={onSelectConversation} />
        </div>
      </div>

      <div className="px-5 mb-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search..." 
            className="pl-10 h-11 bg-white/5 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl text-sm" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-6">
        {isLoading ? (
          <div className="space-y-4 px-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4 items-center animate-pulse">
                <div className="h-12 w-12 bg-white/5 rounded-full" />
                <div className="flex-1 space-y-2"><div className="h-3 bg-white/5 rounded w-1/2" /><div className="h-2 bg-white/5 rounded w-3/4" /></div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-xs text-muted-foreground/40 font-bold uppercase tracking-widest">No results</p>
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
              presenceText = isOnline ? 'Online' : (currentTime ? formatDistanceToNow(lastActive) : 'Offline');
            }

            return (
              <div
                key={room.id}
                onClick={() => onSelectConversation(room.id)}
                className={cn(
                  "w-full p-4 mb-1 flex items-start gap-3 transition-all rounded-2xl relative group cursor-pointer",
                  isSelected ? "bg-white/10 shadow-lg" : "hover:bg-white/5"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 border border-white/5 shadow-md">
                    {room.displayAvatar && <AvatarImage src={room.displayAvatar} />}
                    <AvatarFallback className="bg-muted font-bold">{room.displayName?.[0] || 'C'}</AvatarFallback>
                  </Avatar>
                  {isUnread && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-accent rounded-full border-2 border-background shadow-lg" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={cn("text-sm truncate pr-2 tracking-tight", isUnread ? "font-bold" : "font-semibold text-foreground/80")}>
                      {room.displayName}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-tighter shrink-0">
                        {updatedAt ? formatDistanceToNow(updatedAt, { addSuffix: false }) : ''}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 rounded-full">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-2xl border-white/10">
                          <DropdownMenuItem onClick={(e) => togglePin(e, room.id, room.isPinned)}>
                            {room.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                            {room.isPinned ? 'Unpin' : 'Pin'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => handleDeleteConversation(e, room.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Chat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    {typingUser ? (
                      <p className="text-[10px] text-accent animate-pulse font-bold tracking-widest uppercase">Typing...</p>
                    ) : (
                      <p className={cn("text-[11px] truncate max-w-[140px]", isUnread ? "text-foreground font-medium" : "text-muted-foreground/50")}>
                        {room.lastMessageText || 'No messages'}
                      </p>
                    )}
                    {room.isPinned && <Pin className="h-3 w-3 text-primary/40 fill-primary/40" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
