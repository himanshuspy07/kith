
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, LogOut, MessageSquare, Settings, User, Upload, Loader2, Moon, Sun } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useDoc, useUser, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import NewChatDialog from './NewChatDialog';
import { useToast } from '@/hooks/use-toast';

interface SidebarProps {
  onSelectConversation: (id: string) => void;
  selectedConversationId?: string;
}

export default function Sidebar({ onSelectConversation, selectedConversationId }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  // Settings State
  const [newUsername, setNewUsername] = useState('');
  const [newAvatar, setNewAvatar] = useState('');

  // Fetch current user's Firestore profile to get the latest photo/name
  const currentUserRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: currentUserProfile } = useDoc(currentUserRef);

  // Initial theme check
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

  // Query chat rooms where the user is a member
  const roomsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'chatRooms'),
      where(`members.${user.uid}`, '==', true)
    );
  }, [db, user?.uid]);

  const { data: rooms, isLoading } = useCollection(roomsQuery);

  // Fetch all users to resolve names and avatars in the sidebar (for 1-on-1 chats)
  const allUsersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'users');
  }, [db]);
  const { data: allUsers } = useCollection(allUsersQuery);

  const sortedRooms = useMemo(() => {
    if (!rooms) return [];
    return [...rooms].sort((a, b) => {
      const timeA = a.updatedAt?.toDate?.()?.getTime() || 0;
      const timeB = b.updatedAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
  }, [rooms]);

  const conversationListData = useMemo(() => {
    return sortedRooms.map(room => {
      let displayName = room.name || 'Chat';
      let displayAvatar = null;

      if (!room.isGroupChat && allUsers && user) {
        const otherUserId = room.memberIds?.find((id: string) => id !== user.uid);
        const otherUser = allUsers.find(u => u.id === otherUserId);
        if (otherUser) {
          displayName = otherUser.username;
          displayAvatar = otherUser.profilePictureUrl;
        }
      }

      return {
        ...room,
        displayName,
        displayAvatar
      };
    });
  }, [sortedRooms, allUsers, user]);

  const filteredConversations = conversationListData.filter(room => {
    return room.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleUpdateProfile = async () => {
    if (!user || !db) return;
    
    // 1. Update Auth Profile (Display Name only)
    // We skip photoURL here because Base64 strings are too long for Firebase Auth attributes
    try {
      if (newUsername) {
        await updateProfile(user, {
          displayName: newUsername
        });
      }
    } catch (e) {
      console.error("Failed to update auth display name", e);
    }

    // 2. Update Firestore (Primary store for profile pictures and usernames)
    const userRef = doc(db, 'users', user.uid);
    updateDocumentNonBlocking(userRef, {
      username: newUsername || currentUserProfile?.username || user.email?.split('@')[0],
      profilePictureUrl: newAvatar || currentUserProfile?.profilePictureUrl,
      updatedAt: new Date().toISOString()
    });
    
    setIsSettingsOpen(false);
    toast({
      title: "Profile updated",
      description: "Your changes have been saved to your profile.",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 1MB.",
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewAvatar(reader.result as string);
      setIsUploading(false);
    };
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Could not process the image.",
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-80 h-full border-r border-border flex flex-col bg-background/50 backdrop-blur-sm">
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-primary/20">
            <AvatarImage src={currentUserProfile?.profilePictureUrl || undefined} />
            <AvatarFallback>{currentUserProfile?.username?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-sm truncate max-w-[100px]">{currentUserProfile?.username || 'Kith'}</span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{user?.email}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => signOut(auth)}
          >
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
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Profile Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center gap-4 mb-4">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 border-2 border-primary/20">
                      <AvatarImage src={newAvatar || currentUserProfile?.profilePictureUrl || undefined} />
                      <AvatarFallback className="text-2xl font-bold">{user?.email?.[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Change Profile Photo</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="set-username">Display Name</Label>
                  <Input 
                    id="set-username" 
                    placeholder="Enter new username" 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="bg-muted/30 border-none"
                  />
                </div>
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-sm font-medium">Appearance</span>
                  <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2">
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpdateProfile} disabled={isUploading} className="w-full sm:w-auto">Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <NewChatDialog onChatCreated={onSelectConversation} />
        </div>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search conversations..." 
            className="pl-9 h-9 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 items-center animate-pulse">
                <div className="h-12 w-12 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
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
            const updatedAt = room.updatedAt?.toDate?.() || new Date();
            const isUnread = room.lastMessageText && room.lastMessageSenderId !== user?.uid && (!room.readBy?.includes(user?.uid));
            
            return (
              <button
                key={room.id}
                onClick={() => onSelectConversation(room.id)}
                className={cn(
                  "w-full p-3 flex items-start gap-3 transition-colors hover:bg-muted/20 text-left relative",
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
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(updatedAt, { addSuffix: false })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={cn("text-xs truncate", isUnread ? "text-foreground font-medium" : "text-muted-foreground italic")}>
                      {room.lastMessageText || 'No messages yet'}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
