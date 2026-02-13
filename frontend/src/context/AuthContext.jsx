import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import axios from "axios";

const AuthContext = createContext(null);
const backendUrl = import.meta.env.VITE_BACKEND_URL;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function syncProfile() {
      if (!session?.access_token || !backendUrl) return;

      try {
        await axios.post(
          `${backendUrl}/api/auth/sync-profile`,
          {},
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        );
      } catch (_error) {
        // Sync failure should not block UI.
      }
    }

    syncProfile();
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      signUp: (payload) => supabase.auth.signUp(payload),
      signIn: (payload) => supabase.auth.signInWithPassword(payload),
      signOut: () => supabase.auth.signOut()
    }),
    [session, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return ctx;
}
