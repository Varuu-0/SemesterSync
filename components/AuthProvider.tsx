"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOutNow: () => Promise<void>;
  /** Re-auth with Google asking for the Calendar scope + offline refresh token. */
  connectGoogleCalendar: (redirectPath?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const supabase = supabaseBrowser();

      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user ?? null);
        setLoading(false);
      });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });
      unsub = () => data.subscription.unsubscribe();
    } catch {
      // Supabase not configured — let the UI render and surface the error
      // when the user tries to sign in.
      setLoading(false);
    }
    return () => unsub?.();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async () => {
        const supabase = supabaseBrowser();
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
      },
      signOutNow: async () => {
        const supabase = supabaseBrowser();
        await supabase.auth.signOut();
      },
      connectGoogleCalendar: async (redirectPath = "/dashboard") => {
        const supabase = supabaseBrowser();
        const next = encodeURIComponent(redirectPath);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            scopes:
              "openid email profile https://www.googleapis.com/auth/calendar",
            // access_type=offline + prompt=consent forces Google to issue a
            // refresh token even on subsequent re-grants. Without this we'd
            // only get a 1-hour access token, no way to refresh server-side.
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
            redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
          },
        });
        if (error) throw error;
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
