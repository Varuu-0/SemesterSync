import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  GraduationCap, Sparkles, Calendar, Brain, Shield, ArrowRight, Zap, BookOpen, BarChart3, User
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: Calendar, title: 'Unified Calendar', desc: 'All your courses, one view' },
  { icon: Brain, title: 'AI Extraction', desc: 'Smart syllabus parsing' },
  { icon: BarChart3, title: 'Burnout Detection', desc: 'Stay ahead of overload' },
  { icon: BookOpen, title: 'Smart Planner', desc: 'Auto-generated task lists' },
];

export default function LoginPage() {
  const { initializeGoogleSignIn, loginAsGuest } = useAuth();
  const googleBtnRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isConfigured = clientId && clientId !== 'YOUR_CLIENT_ID_HERE';

  useEffect(() => {
    if (googleBtnRef.current && isConfigured) {
      initializeGoogleSignIn(googleBtnRef.current);
    }
  }, [initializeGoogleSignIn, isConfigured]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background font-sans p-4 sm:p-8" id="login-page">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--foreground) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/15 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-20 max-w-6xl w-full mx-auto">
        {/* Left - Hero */}
        <div className="flex-1 text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
          <Badge variant="secondary" className="gap-1.5 px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
            <Zap size={14} />
            Built for students, by students
          </Badge>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-foreground">
            Your semester,
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              perfectly synced.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed">
            Upload your syllabi and let AI create a unified calendar with smart
            planning, deadline tracking, and burnout detection.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-primary/20 transition-all duration-200 group">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <Icon size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{title}</span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Login Card */}
        <Card className="w-full max-w-md shadow-2xl border-primary/10 bg-background/80 backdrop-blur-2xl animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
          <CardHeader className="text-center space-y-4 pb-6 pt-8">
            <div className="flex flex-col items-center gap-3">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <GraduationCap size={28} />
              </div>
              <div className="flex items-center gap-1.5 text-2xl font-black tracking-tight">
                <span>Semester</span>
                <span className="text-primary">Sync</span>
                <Badge variant="secondary" className="ml-1.5 gap-1 bg-primary/10 text-primary text-xs border-primary/20">
                  <Sparkles size={10} /> AI
                </Badge>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Sign in to sync your semester
            </p>
          </CardHeader>

          <CardContent className="space-y-5 px-6 sm:px-8">
            {/* Google Sign-In Button */}
            {isConfigured ? (
              <div className="flex justify-center">
                <div ref={googleBtnRef} id="google-signin-btn" />
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground">
                <Shield size={18} className="mt-0.5 shrink-0 text-amber-500" />
                <p>
                  Google OAuth not configured.
                  <br />
                  <span className="text-xs">Set <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">VITE_GOOGLE_CLIENT_ID</code> in your <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">.env</code> file.</span>
                </p>
              </div>
            )}

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <span className="relative bg-background px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">or</span>
            </div>

            {/* Guest / Demo mode */}
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-base font-semibold border-border hover:border-primary/50 hover:bg-primary/5 group transition-all"
              onClick={loginAsGuest}
              id="guest-login-btn"
            >
              <User size={18} />
              <span>Continue as Guest</span>
              <ArrowRight size={16} className="ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Button>

            <p className="text-[11px] text-center text-muted-foreground leading-relaxed px-4">
              By signing in, you agree to our Terms of Service and Privacy
              Policy. Your data stays in your browser.
            </p>
          </CardContent>

          <CardFooter className="pb-6 pt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield size={12} />
              <span>Secure, private, no data stored on servers</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
