"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth, useFirestore } from '@/firebase';
import { initiateEmailSignIn, initiateEmailSignUp } from '@/firebase/non-blocking-login';
import BrandLogo from '@/components/ui/brand-logo';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const auth = useAuth();
  const db = useFirestore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      initiateEmailSignIn(auth, email, password);
    } else {
      initiateEmailSignUp(auth, email, password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]" />
      
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4 pt-10">
          <BrandLogo size="lg" className="justify-center" />
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              {isLogin ? 'Enter your credentials to access your chats' : 'Join Kith and start connecting simply'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs uppercase tracking-widest font-bold opacity-70">Username</Label>
                <Input 
                  id="username" 
                  placeholder="johndoe" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-muted/50 border-none h-11"
                  required 
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest font-bold opacity-70">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/50 border-none h-11"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest font-bold opacity-70">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/50 border-none h-11"
                required 
              />
            </div>
            <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 mt-2">
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t border-border/30 pt-6">
          <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </Button>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium">
              &copy; 2024 Kith Messaging
            </p>
            <p className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.3em] font-bold animate-pulse">
              Made by <span className="text-primary/70">Himanshu Yadav</span>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
