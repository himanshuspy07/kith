
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/firebase';
import { initiateEmailSignIn, initiateEmailSignUp, initiatePasswordReset } from '@/firebase/non-blocking-login';
import BrandLogo from '@/components/ui/brand-logo';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
        await initiateEmailSignUp(auth, email, password);
      } else if (mode === 'reset') {
        await initiatePasswordReset(auth, email);
        setResetSent(true);
        toast({
          title: "Reset link sent",
          description: "Check your inbox for password reset instructions.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "Something went wrong.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <Card className="w-full max-w-md border-white/5 bg-white/5 backdrop-blur-3xl shadow-2xl relative z-10 rounded-[2.5rem] text-center p-10">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-accent/20 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-accent" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold mb-4">Check your email</CardTitle>
          <CardDescription className="mb-8">
            We've sent a password reset link to <span className="text-foreground font-bold">{email}</span>.
          </CardDescription>
          <Button 
            variant="outline" 
            className="w-full h-14 rounded-2xl border-white/10 hover:bg-white/5 font-bold uppercase tracking-widest text-xs"
            onClick={() => {
              setResetSent(false);
              setMode('login');
            }}
          >
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[160px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[160px] translate-y-1/2 -translate-x-1/2" />
      
      <Card className="w-full max-w-md border-white/5 bg-white/5 backdrop-blur-3xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] relative z-10 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center space-y-6 pt-12">
          <BrandLogo size="lg" className="justify-center" />
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tighter">
              {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Join Kith' : 'Reset Password'}
            </CardTitle>
            <CardDescription className="text-muted-foreground/50 font-medium uppercase tracking-[0.2em] text-[10px]">
              {mode === 'login' ? 'Access your professional network' : mode === 'signup' ? 'Connect with friends simply' : 'Retrieve your account access'}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="px-10 pb-6">
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-primary">Username</Label>
                <Input 
                  placeholder="e.g. johndoe" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className="bg-white/5 border-none h-14 rounded-2xl px-5" 
                  required 
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-primary">Email Address</Label>
              <Input 
                type="email" 
                placeholder="name@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="bg-white/5 border-none h-14 rounded-2xl px-5" 
                required 
              />
            </div>
            {mode !== 'reset' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-primary">Password</Label>
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => setMode('reset')}
                      className="text-[9px] uppercase font-bold text-muted-foreground hover:text-primary transition-colors tracking-widest"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <Input 
                  type="password" 
                  placeholder="••••••••"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="bg-white/5 border-none h-14 rounded-2xl px-5" 
                  required 
                />
              </div>
            )}
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-2xl transition-all active:scale-[0.98] mt-4 uppercase tracking-[0.2em] text-xs"
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : mode === 'login' ? 'Login' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-6 bg-black/20 pt-8 pb-10 px-10">
          {mode === 'reset' ? (
            <Button 
              variant="link" 
              onClick={() => setMode('login')} 
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest flex items-center gap-2"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Sign In
            </Button>
          ) : (
            <Button 
              variant="link" 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} 
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
            >
              {mode === 'login' ? "Need an account? Sign Up" : "Have an account? Sign In"}
            </Button>
          )}
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground/30 uppercase tracking-[0.4em] font-bold">Kith Professional Messenger &copy; 2026</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
