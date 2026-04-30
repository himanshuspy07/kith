"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Camera, User, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, onSnapshot, setDoc, addDoc, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
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
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceUnsubscribeRef = useRef<(() => void) | null>(null);

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

  // Clean up WebRTC on end
  const cleanup = async () => {
    if (iceUnsubscribeRef.current) {
      iceUnsubscribeRef.current();
      iceUnsubscribeRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setActiveCall(null);
    setCallStatus('idle');
  };

  const setupMedia = async (type: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      setLocalStream(stream);
      setHasCameraPermission(true);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing media:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Please enable camera and microphone permissions.',
      });
      return null;
    }
  };

  const createPeerConnection = (callId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && db) {
        const side = activeCall?.callerId === user?.uid ? 'callerCandidates' : 'receiverCandidates';
        const candidateData = event.candidate.toJSON();
        const candidatesCol = collection(db, 'calls', callId, side);
        addDocumentNonBlocking(candidatesCol, candidateData);
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    pcRef.current = pc;
    return pc;
  };

  const handleAnswer = async () => {
    if (!activeCall || !db || !user) return;

    const stream = await setupMedia(activeCall.type);
    if (!stream) return;

    const pc = createPeerConnection(activeCall.id);
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

      // Listen for caller ICE candidates with proper cleanup tracking
      const candidatesCol = collection(db, 'calls', activeCall.id, 'callerCandidates');
      const unsubscribe = onSnapshot(candidatesCol, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
          }
        });
      }, async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: candidatesCol.path,
          operation: 'list'
        }));
      });
      
      iceUnsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error("Signaling error:", error);
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
        if (data?.status === 'ongoing' && callStatus === 'calling' && data.answer) {
          pcRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
          setCallStatus('ongoing');
        }
      }, async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: callRef.path,
          operation: 'get'
        }));
      });
      return () => unsubscribe();
    }
  }, [activeCall, db, callStatus]);

  if (callStatus === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-4xl aspect-video bg-card border-none shadow-2xl relative overflow-hidden flex flex-col md:flex-row">
        
        <div className="flex-1 bg-muted relative">
          <video 
            ref={remoteVideoRef} 
            className="w-full h-full object-cover" 
            autoPlay 
            playsInline 
          />
          {(!remoteStream || callStatus === 'ringing' || callStatus === 'calling') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
              <Avatar className="h-32 w-32 border-4 border-primary/20 animate-pulse">
                <AvatarFallback className="text-4xl">
                  {activeCall?.callerId === user?.uid ? '...' : activeCall?.callerName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  {activeCall?.callerId === user?.uid ? 'Calling...' : activeCall?.callerName}
                </h2>
                <p className="text-muted-foreground">
                  {callStatus === 'ringing' ? 'Incoming call' : 'Waiting for answer...'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute top-4 right-4 w-48 aspect-video bg-black rounded-xl border border-white/10 shadow-xl overflow-hidden z-10">
          <video 
            ref={localVideoRef} 
            className="w-full h-full object-cover mirror" 
            autoPlay 
            muted 
            playsInline 
          />
          {isVideoOff && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <VideoOff className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background/50 backdrop-blur-xl p-4 rounded-full border border-white/10 shadow-2xl z-20">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-12 w-12 rounded-full", isMicMuted ? "bg-destructive text-white" : "bg-muted/50")}
            onClick={() => {
              if (localStream) {
                const track = localStream.getAudioTracks()[0];
                track.enabled = !track.enabled;
                setIsMicMuted(!track.enabled);
              }
            }}
          >
            {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {activeCall?.type === 'video' && (
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-12 w-12 rounded-full", isVideoOff ? "bg-destructive text-white" : "bg-muted/50")}
              onClick={() => {
                if (localStream) {
                  const track = localStream.getVideoTracks()[0];
                  track.enabled = !track.enabled;
                  setIsVideoOff(!track.enabled);
                }
              }}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          )}

          {callStatus === 'ringing' ? (
            <>
              <Button 
                className="h-12 px-8 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold flex gap-2"
                onClick={handleAnswer}
              >
                <Phone className="h-5 w-5" />
                Answer
              </Button>
              <Button 
                variant="destructive"
                className="h-12 w-12 rounded-full"
                onClick={handleHangup}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button 
              variant="destructive"
              className="h-12 px-8 rounded-full font-bold flex gap-2"
              onClick={handleHangup}
            >
              <PhoneOff className="h-5 w-5" />
              End Call
            </Button>
          )}
        </div>
      </Card>
      
      {hasCameraPermission === false && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[110]">
          <Card className="p-4 bg-destructive text-destructive-foreground border-none">
            <h3 className="font-bold">Camera Access Required</h3>
            <p className="text-sm">Please allow camera access to use video calls.</p>
          </Card>
        </div>
      )}
    </div>
  );
}