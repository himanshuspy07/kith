
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
    // Auth state change will handle the rest via FirebaseProvider
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4 pt-10">
          <BrandLogo size="lg" className="justify-center" />
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              {isLogin ? 'Access your chats across devices' : 'Join Kith and connect simply'}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold opacity-70">Username</Label>
                <Input 
                  placeholder="johndoe" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className="bg-muted/50 border-none h-11" 
                  required={!isLogin} 
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest font-bold opacity-70">Email</Label>
              <Input 
                type="email" 
                placeholder="m@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="bg-muted/50 border-none h-11" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest font-bold opacity-70">Password</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="bg-muted/50 border-none h-11" 
                required 
              />
            </div>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg mt-2"
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4 border-t border-border/30 pt-6">
          <Button 
            variant="link" 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </Button>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium">&copy; 2026 Kith Messaging</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
