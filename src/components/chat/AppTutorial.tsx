
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  MessageSquarePlus, 
  Smile, 
  Pin, 
  Palette, 
  ArrowRight, 
  Check, 
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';

const TUTORIAL_STEPS = [
  {
    title: "Welcome to kith",
    description: "A modern, professional space for your private and group conversations. Let's get you settled in.",
    icon: Sparkles,
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    title: "Start a Conversation",
    description: "Click the '+' icon in the sidebar to search for colleagues or create a new group chat instantly.",
    icon: MessageSquarePlus,
    color: "text-accent",
    bgColor: "bg-accent/10"
  },
  {
    title: "Express Yourself",
    description: "Reply to specific messages, add emoji reactions, or share photos directly from your device.",
    icon: Smile,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10"
  },
  {
    title: "Stay Organized",
    description: "Pin your most important conversations to keep them at the top of your list for quick access.",
    icon: Pin,
    color: "text-red-500",
    bgColor: "bg-red-500/10"
  },
  {
    title: "Make it Yours",
    description: "Change your profile photo, update your bio, and choose aesthetic wallpapers for each chat room.",
    icon: Palette,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  }
];

export default function AppTutorial() {
  const { user } = useUser();
  const db = useFirestore();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const userRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  
  const { data: userData } = useDoc(userRef);

  useEffect(() => {
    if (userData && userData.hasSeenTutorial === false) {
      setOpen(true);
    }
  }, [userData]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    if (userRef) {
      updateDocumentNonBlocking(userRef, { hasSeenTutorial: true });
    }
    setOpen(false);
  };

  const StepIcon = TUTORIAL_STEPS[currentStep].icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none bg-card rounded-[2.5rem] shadow-2xl">
        <div className="p-8 md:p-10 flex flex-col items-center text-center space-y-8">
          <div className={cn(
            "h-24 w-24 rounded-[2rem] flex items-center justify-center transition-all duration-500",
            TUTORIAL_STEPS[currentStep].bgColor
          )}>
            <StepIcon className={cn("h-12 w-12", TUTORIAL_STEPS[currentStep].color)} />
          </div>

          <div className="space-y-3">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {TUTORIAL_STEPS[currentStep].title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground leading-relaxed">
              {TUTORIAL_STEPS[currentStep].description}
            </DialogDescription>
          </div>

          <div className="flex gap-2">
            {TUTORIAL_STEPS.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentStep ? "w-8 bg-primary" : "w-2 bg-muted"
                )} 
              />
            ))}
          </div>
        </div>

        <div className="bg-black/20 p-6 md:p-8 flex items-center justify-between border-t border-white/5">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            disabled={currentStep === 0}
            className="rounded-xl px-4 text-muted-foreground disabled:opacity-0"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          <Button 
            onClick={handleNext} 
            className="rounded-xl px-8 h-12 font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95"
          >
            {currentStep === TUTORIAL_STEPS.length - 1 ? (
              <>Finish <Check className="ml-2 h-4 w-4" /></>
            ) : (
              <>Next <ChevronRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
