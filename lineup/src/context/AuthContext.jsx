import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { IS_SUPABASE } from '../lib/mode.js';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

// Where Supabase should send password-reset / confirmation links back to.
export function authRedirectTo() {
  return `${window.location.origin}${import.meta.env.BASE_URL || '/'}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  // Restore session from the httpOnly cookie on first load.
  useEffect(() => {
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Supabase: when a password-reset link is opened, supabase-js establishes a
  // temporary recovery session and fires PASSWORD_RECOVERY — show the reset UI.
  useEffect(() => {
    if (!IS_SUPABASE || !supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api.login({ email, password });
    setUser(d.user);
    return d.user;
  }, []);

  const signup = useCallback(async (email, username, password) => {
    const d = await api.signup({ email, username, password });
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    return api.requestPasswordReset(email, authRedirectTo());
  }, []);

  const updatePassword = useCallback(async (password) => {
    await api.updatePassword(password);
    setRecovering(false);
    // Refresh the user from the now-elevated session.
    try {
      const d = await api.me();
      setUser(d.user);
    } catch {
      /* recovery session may not resolve to a profile in demo — ignore */
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, recovering, login, signup, logout, requestPasswordReset, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
