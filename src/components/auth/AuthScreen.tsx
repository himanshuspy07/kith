"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/firebase';
import { 
  initiateEmailSignIn, 
  initiateEmailSignUp, 
  initiatePasswordReset, 
  initiateGoogleSignIn
} from '@/firebase/non-blocking-login';
import BrandLogo from '@/components/ui/brand-logo';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from 'firebase/auth';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const auth = useAuth();
  const { toast } = useToast();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await initiateEmailSignIn(auth, email, password);
      } else if (mode === 'signup') {
        const userCredential = await initiateEmailSignUp(auth, email, password);
        if (userCredential.user && username) {
          await updateProfile(userCredential.user, { displayName: username });
        }
        toast({ title: "Verification sent", description: "Please check your inbox." });
      } else if (mode === 'reset') {
        await initiatePasswordReset(auth, email);
        setResetSent(true);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Authentication Error", description: error.message || "Failed to authenticate." });
    } finally {
      setIsLoading(false);
    }
  };

  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-sm border-none shadow-none text-center space-y-8 p-10 bg-card rounded-[3rem]">
          <div className="flex justify-center"><CheckCircle2 className="h-20 w-20 text-accent" /></div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">Check your email</h1>
            <p className="text-muted-foreground text-sm font-medium">We've sent reset instructions to your inbox.</p>
          </div>
          <Button variant="outline" className="w-full h-14 rounded-2xl border-white/5 font-bold" onClick={() => { setResetSent(false); setMode('login'); }}>Back to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Triadic Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/20 blur-[120px] rounded-full" />
      
      <main className="w-full max-w-sm space-y-10 animate-in-fade relative z-10">
        <div className="text-center space-y-8">
          <BrandLogo size="lg" className="justify-center" />
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic kith-text">
              {mode === 'login' ? 'Hello Again' : mode === 'signup' ? 'Join Us' : 'Recover'}
            </h1>
            <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">
              {mode === 'login' ? 'Step into kith' : mode === 'signup' ? 'Create a friendly space' : 'We will help you back'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Button 
            variant="outline" 
            onClick={() => initiateGoogleSignIn(auth)} 
            disabled={isGoogleLoading}
            className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-bold border-white/5 bg-card/50 backdrop-blur-xl shadow-xl hover:scale-[1.02] transition-transform"
          >
            {isGoogleLoading ? <Loader2 className="animate-spin h-5 w-5" /> : (
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Google Account
          </Button>

          <div className="flex items-center gap-4 text-muted-foreground/30 text-[10px] font-black uppercase tracking-[0.4em]">
            <div className="flex-1 h-px bg-border" />
            or
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Username</Label>
                <Input placeholder="friendly_name" value={username} onChange={(e) => setUsername(e.target.value)} className="h-14 rounded-2xl bg-card border-none px-6 text-sm font-medium" required />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Email</Label>
              <Input type="email" placeholder="you@kith.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 rounded-2xl bg-card border-none px-6 text-sm font-medium" required />
            </div>
            {mode !== 'reset' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Password</Label>
                  {mode === 'login' && <button type="button" onClick={() => setMode('reset')} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">Forgot?</button>}
                </div>
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl bg-card border-none px-6 text-sm font-medium" required />
              </div>
            )}
            <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4">
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Start Chatting' : 'Send Code'}
            </Button>
          </form>
        </div>

        <div className="text-center">
          <Button variant="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary">
            {mode === 'login' ? "New here? Create Account" : "Back to Sign In"}
          </Button>
        </div>
      </main>
    </div>
  );
}