import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAction } from 'convex/react';
import { api, type Id } from '../convex/api';

const STORAGE_KEY = 'connex_session_id';

interface AuthUser {
  id: string;
  name: string;
  phone: string;
}

interface AuthContextValue {
  sessionId: Id<'sessions'> | null;
  user: AuthUser | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<Id<'sessions'> | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loginAction = useAction(api.auth.login);
  const registerAction = useAction(api.auth.register);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedUser = localStorage.getItem(`${STORAGE_KEY}_user`);
    if (stored) setSessionId(stored as Id<'sessions'>);
    if (storedUser) setUser(JSON.parse(storedUser));
    setLoading(false);
  }, []);

  function persist(newSessionId: string, newUser: AuthUser) {
    localStorage.setItem(STORAGE_KEY, newSessionId);
    localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(newUser));
    setSessionId(newSessionId as Id<'sessions'>);
    setUser(newUser);
  }

  const login = useCallback(async (phone: string, password: string) => {
    const result = await loginAction({ phone, password });
    persist(result.sessionId, { id: result.user.id, name: result.user.name, phone: result.user.phone });
  }, [loginAction]);

  const register = useCallback(async (name: string, phone: string, password: string) => {
    const result = await registerAction({ name, phone, password });
    persist(result.sessionId, { id: result.user.id, name: result.user.name, phone: result.user.phone });
  }, [registerAction]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}_user`);
    setSessionId(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ sessionId, user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
