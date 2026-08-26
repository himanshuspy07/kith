"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, User, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function CallManager() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [activeCall, setActiveCall] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'ongoing' | 'ended'>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceUnsubscribeRef = useRef<(() => void) | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Listen for incoming calls
  const incomingCallsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );
  }, [db, user?.uid]);
  
  const { data: incomingCalls } = useCollection(incomingCallsQuery);

  useEffect(() => {
    if (incomingCalls && incomingCalls.length > 0 && !activeCall) {
      setActiveCall(incomingCalls[0]);
      setCallStatus('ringing');
    }
  }, [incomingCalls, activeCall]);

  const cleanup = () => {
    if (iceUnsubscribeRef.current) iceUnsubscribeRef.current();
    if (pcRef.current) pcRef.current.close();
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setCallStatus('idle');
    pcRef.current = null;
  };

  const setupMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Microphone Required',
        description: 'Please enable microphone access to use audio calls.',
      });
      return null;
    }
  };

  const createPeerConnection = (callId: string, isCaller: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && db) {
        const side = isCaller ? 'callerCandidates' : 'receiverCandidates';
        const candidatesCol = collection(db, 'calls', callId, side);
        addDocumentNonBlocking(candidatesCol, event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const handleAnswer = async () => {
    if (!activeCall || !db || !user) return;

    const stream = await setupMedia();
    if (!stream) {
      handleHangup();
      return;
    }

    const pc = createPeerConnection(activeCall.id, false);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(activeCall.offer));
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      const callRef = doc(db, 'calls', activeCall.id);
      updateDocumentNonBlocking(callRef, {
        answer: {
          type: answerDescription.type,
          sdp: answerDescription.sdp,
        },
        status: 'ongoing'
      });

      setCallStatus('ongoing');

      // Listen for caller candidates
      const candidatesCol = collection(db, 'calls', activeCall.id, 'callerCandidates');
      const unsubscribe = onSnapshot(candidatesCol, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
          }
        });
      }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: candidatesCol.path, operation: 'list' }));
      });
      iceUnsubscribeRef.current = unsubscribe;
    } catch (error) {
      cleanup();
    }
  };

  const handleHangup = () => {
    if (activeCall && db) {
      const callRef = doc(db, 'calls', activeCall.id);
      updateDocumentNonBlocking(callRef, { status: 'ended' });
    }
    cleanup();
  };

  useEffect(() => {
    if (activeCall && db) {
      const callRef = doc(db, 'calls', activeCall.id);
      const unsubscribe = onSnapshot(callRef, (snapshot) => {
        const data = snapshot.data();
        if (data?.status === 'ended') {
          cleanup();
        }
      });
      return () => unsubscribe();
    }
  }, [activeCall, db]);

  if (callStatus === 'idle') return null;

  const otherPartyName = activeCall?.callerId === user?.uid ? activeCall?.receiverName : activeCall?.callerName;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-in-fade">
      <audio ref={remoteAudioRef} autoPlay />
      
      <Card className="w-full max-w-sm bg-card/10 border-white/5 shadow-2xl flex flex-col items-center gap-12 p-12 rounded-[3.5rem] relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 blur-[100px] animate-pulse" />
        
        <div className="relative flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
            <Avatar className="h-32 w-32 border-4 border-background ring-4 ring-primary/20 shadow-2xl">
              <AvatarFallback className="text-4xl font-black bg-muted text-primary">
                {otherPartyName?.[0]}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">{otherPartyName}</h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em]">
              {callStatus === 'ringing' ? 'Incoming Audio Call' : 
               callStatus === 'calling' ? 'Calling...' : 
               callStatus === 'ongoing' ? 'On Call' : 'Call Ended'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-16 w-16 rounded-full border border-white/5 transition-all",
              isMicMuted ? "bg-destructive text-white" : "bg-white/5"
            )}
            onClick={() => {
              if (localStream) {
                const track = localStream.getAudioTracks()[0];
                track.enabled = !track.enabled;
                setIsMicMuted(!track.enabled);
              }
            }}
          >
            {isMicMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {callStatus === 'ringing' && (
            <Button 
              className="h-16 px-8 rounded-full bg-accent text-accent-foreground font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-105 active:scale-95"
              onClick={handleAnswer}
            >
              <Phone className="h-6 w-6 mr-2" /> Answer
            </Button>
          )}

          <Button 
            variant="destructive"
            size="icon"
            className="h-16 w-16 rounded-full shadow-xl shadow-destructive/20 hover:scale-105 active:scale-95"
            onClick={handleHangup}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </Card>
    </div>
  );
}