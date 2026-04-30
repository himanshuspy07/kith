
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/firebase';
import { initiateEmailSignIn, initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import BrandLogo from '@/components/ui/brand-logo';
import { Phone, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AuthScreen() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const auth = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (authMethod === 'phone' && !window.recaptchaVerifier && auth) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        }
      });
    }
  }, [authMethod, auth]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (isLogin) {
      initiateEmailSignIn(auth, email, password);
    } else {
      initiateEmailSignUp(auth, email, password);
    }
    // Auth state change will handle the rest via FirebaseProvider
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setIsLoading(true);
    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      setConfirmationResult(result);
      toast({ title: "Code Sent", description: "Please check your SMS for the verification code." });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Could not send code." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !verificationCode) return;
    setIsLoading(true);
    try {
      await confirmationResult.confirm(verificationCode);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Verification Failed", description: "Invalid code entered." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      <div id="recaptcha-container" />
      
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4 pt-10">
          <BrandLogo size="lg" className="justify-center" />
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {confirmationResult ? 'Verify Your Phone' : isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              {confirmationResult ? 'Enter the 6-digit code sent to your device' : isLogin ? 'Access your chats across devices' : 'Join Kith and connect simply'}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          {!confirmationResult ? (
            <Tabs defaultValue="email" onValueChange={(val) => setAuthMethod(val as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-muted/50 p-1">
                <TabsTrigger value="email" className="flex items-center gap-2 font-semibold"><Mail className="h-4 w-4" /> Email</TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-2 font-semibold"><Phone className="h-4 w-4" /> Phone</TabsTrigger>
              </TabsList>

              <TabsContent value="email">
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-widest font-bold opacity-70">Username</Label>
                      <Input placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-muted/50 border-none h-11" required />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold opacity-70">Email</Label>
                    <Input type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted/50 border-none h-11" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold opacity-70">Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-muted/50 border-none h-11" required />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg mt-2">
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : isLogin ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="phone">
                <form onSubmit={handlePhoneSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold opacity-70">Phone Number</Label>
                    <Input placeholder="+1234567890" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="bg-muted/50 border-none h-11" required />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg mt-2">
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Send OTP'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold opacity-70">Verification Code</Label>
                <Input placeholder="123456" maxLength={6} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className="bg-muted/50 border-none h-11 text-center text-lg tracking-[0.5em] font-bold" required />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg">
                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verify & Sign In'}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setConfirmationResult(null)}>Try again</Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4 border-t border-border/30 pt-6">
          {!confirmationResult && (
            <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </Button>
          )}
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium">&copy; 2026 Kith Messaging</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
