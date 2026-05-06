
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/firebase';
import { 
  initiateEmailSignIn, 
  initiateEmailSignUp, 
  initiatePasswordReset, 
  initiateGoogleSignIn,
  initiateTwitterSignIn
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
  const [isTwitterLoading, setIsTwitterLoading] = useState(false);
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
          await updateProfile(userCredential.user, {
            displayName: username
          });
        }
        toast({
          title: "Account created",
          description: "Check your email for a verification link.",
        });
      } else if (mode === 'reset') {
        await initiatePasswordReset(auth, email);
        setResetSent(true);
        toast({
          title: "Reset link sent",
          description: "Check your inbox for password reset instructions.",
        });
      }
    } catch (error: any) {
      let errorMessage = "Something went wrong.";
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        if (mode === 'login') {
          errorMessage = "Account not found or password incorrect. If you haven't joined kith, please sign up first.";
        } else {
          errorMessage = "Invalid credentials provided.";
        }
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "An account already exists with this email. Try logging in.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await initiateGoogleSignIn(auth);
      toast({
        title: "Welcome to kith",
        description: "Successfully signed in with Google.",
      });
    } catch (error: any) {
      let errorMessage = error.message || "Could not complete Google authentication.";
      
      if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Google Sign-In is not enabled in the Firebase Console. Please go to Authentication > Sign-in method and enable Google.";
      }

      toast({
        variant: "destructive",
        title: "Google Sign In Failed",
        description: errorMessage,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleTwitterSignIn = async () => {
    setIsTwitterLoading(true);
    try {
      await initiateTwitterSignIn(auth);
      toast({
        title: "Welcome to kith",
        description: "Successfully signed in with X.",
      });
    } catch (error: any) {
      let errorMessage = error.message || "Could not complete X authentication.";
      
      if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Twitter/X Sign-In is not enabled in the Firebase Console. Please go to Authentication > Sign-in method and enable Twitter.";
      }

      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: errorMessage,
      });
    } finally {
      setIsTwitterLoading(false);
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
          <h1 className="text-2xl font-bold mb-4">Check your email</h1>
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
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[160px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[160px] translate-y-1/2 -translate-x-1/2" />
      
      <main className="w-full max-w-md relative z-10">
        <Card className="w-full border-white/5 bg-white/5 backdrop-blur-3xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden">
          <CardHeader className="text-center space-y-6 pt-12">
            <BrandLogo size="lg" className="justify-center" showText={true} />
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter">
                {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Join kith' : 'Reset Password'}
              </h1>
              <p className="text-muted-foreground/50 font-medium uppercase tracking-[0.2em] text-[10px]">
                {mode === 'login' ? 'Access your professional network' : mode === 'signup' ? 'Connect with friends simply' : 'Retrieve your account access'}
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="px-10 pb-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleGoogleSignIn} 
                  disabled={isGoogleLoading || isTwitterLoading}
                  className="h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-foreground font-bold flex items-center justify-center gap-2 transition-all"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Google
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={handleTwitterSignIn} 
                  disabled={isTwitterLoading || isGoogleLoading}
                  className="h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-foreground font-bold flex items-center justify-center gap-2 transition-all"
                >
                  {isTwitterLoading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                        />
                      </svg>
                      X / Twitter
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-4 py-2">
                <Separator className="flex-1 bg-white/5" />
                <span className="text-[10px] uppercase font-bold text-muted-foreground/40 tracking-[0.2em]">or</span>
                <Separator className="flex-1 bg-white/5" />
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-5">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-primary">Username</Label>
                    <Input 
                      placeholder="e.g. johndoe" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      className="bg-white/5 border-none h-14 rounded-2xl px-5 focus-visible:ring-1 focus-visible:ring-primary/20" 
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
                    className="bg-white/5 border-none h-14 rounded-2xl px-5 focus-visible:ring-1 focus-visible:ring-primary/20" 
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
                      className="bg-white/5 border-none h-14 rounded-2xl px-5 focus-visible:ring-1 focus-visible:ring-primary/20" 
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
            </div>
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
              <p className="text-[9px] text-muted-foreground/30 uppercase tracking-[0.4em] font-bold">kith &copy; 2026</p>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
