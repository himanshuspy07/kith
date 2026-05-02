
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/firebase';
import { initiateEmailSignIn, initiateEmailSignUp } from '@/firebase/non-blocking-login';
import BrandLogo from '@/components/ui/brand-logo';
import { Loader2 } from 'lucide-react';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const auth = useAuth();

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (isLogin) {
      initiateEmailSignIn(auth, email, password);
    } else {
      initiateEmailSignUp(auth, email, password);
    }
  };

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
              {isLogin ? 'Sign In' : 'Join Kith'}
            </CardTitle>
            <CardDescription className="text-muted-foreground/50 font-medium uppercase tracking-[0.2em] text-[10px]">
              {isLogin ? 'Access your professional network' : 'Connect with friends simply'}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="px-10 pb-10">
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-primary">Username</Label>
                <Input 
                  placeholder="e.g. johndoe" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className="bg-white/5 border-none h-14 rounded-2xl px-5" 
                  required={!isLogin} 
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
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-primary">Password</Label>
              <Input 
                type="password" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="bg-white/5 border-none h-14 rounded-2xl px-5" 
                required 
              />
            </div>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-2xl transition-all active:scale-[0.98] mt-4 uppercase tracking-[0.2em] text-xs"
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : isLogin ? 'Login' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-6 bg-black/20 pt-8 pb-10 px-10">
          <Button 
            variant="link" 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
          >
            {isLogin ? "Need an account? Sign Up" : "Have an account? Sign In"}
          </Button>
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground/30 uppercase tracking-[0.4em] font-bold">Kith Professional Messenger &copy; 2026</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
