
"use client";

import React from 'react';
import { 
  Bell, 
  BellRing, 
  MessageCircle, 
  AtSign, 
  Info, 
  CheckCheck, 
  Trash2, 
  ExternalLink 
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function NotificationCenter() {
  const { user } = useUser();
  const db = useFirestore();

  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [db, user?.uid]);

  const { data: notifications, isLoading } = useCollection(notificationsQuery);

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const markAsRead = (id: string) => {
    if (!db || !user?.uid) return;
    const ref = doc(db, 'users', user.uid, 'notifications', id);
    updateDocumentNonBlocking(ref, { isRead: true });
  };

  const markAllAsRead = () => {
    if (!db || !user?.uid || !notifications) return;
    notifications.forEach(n => {
      if (!n.isRead) markAsRead(n.id);
    });
  };

  const clearAll = () => {
    if (!db || !user?.uid || !notifications) return;
    notifications.forEach(n => {
      const ref = doc(db, 'users', user.uid, 'notifications', n.id);
      deleteDocumentNonBlocking(ref);
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'mention': return <AtSign className="h-4 w-4 text-accent" />;
      case 'message': return <MessageCircle className="h-4 w-4 text-primary" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-white/5">
          {unreadCount > 0 ? (
            <>
              <BellRing className="h-5 w-5 text-primary animate-pulse" />
              <Badge className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 flex items-center justify-center bg-primary text-[8px] font-black rounded-full border-2 border-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            </>
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-0 bg-card/95 backdrop-blur-xl border-white/5 rounded-[2rem] shadow-2xl overflow-hidden z-[60]">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Notifications</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-[9px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary">
              <CheckCheck className="h-3 w-3 mr-1" /> Mark Read
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-[9px] uppercase font-bold tracking-widest text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Bell className="h-8 w-8 text-muted-foreground/20 animate-bounce" /></div>
          ) : notifications && notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-4 border-b border-white/5 flex gap-4 transition-colors relative group",
                    !n.isRead ? "bg-primary/5" : "hover:bg-white/5"
                  )}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                    !n.isRead ? "bg-primary/20" : "bg-black/20"
                  )}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className={cn("text-xs leading-none truncate", !n.isRead ? "font-bold" : "font-medium")}>
                        {n.title}
                      </p>
                      <span className="text-[8px] font-bold text-muted-foreground/40 uppercase whitespace-nowrap ml-2">
                        {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: false }) : 'just now'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {n.body}
                    </p>
                  </div>
                  {!n.isRead && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-center p-8 opacity-30">
              <Bell className="h-12 w-12 mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Inbox Zero</p>
              <p className="text-xs mt-2">No new updates right now.</p>
            </div>
          )}
        </ScrollArea>
        <div className="p-3 bg-black/20 text-center border-t border-white/5">
          <p className="text-[9px] text-muted-foreground/50 uppercase font-black tracking-[0.3em]">kith &copy; 2026</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
