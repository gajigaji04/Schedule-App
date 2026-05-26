'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/supabase';
import { upsertUser, getCurrentUser } from '@/models/userModel';

const AuthContext = createContext(null);

const CACHE_KEY = 'ts_user_v1';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12시간

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { user, at } = JSON.parse(raw);
    if (Date.now() - at > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return user;
  } catch { return null; }
}
function writeCache(user) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ user, at: Date.now() })); } catch {}
}
function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

export function AuthProvider({ children }) {
  const cached = typeof window !== 'undefined' ? readCache() : null;
  const [user, setUser] = useState(cached);
  const [loading, setLoading] = useState(!cached); // 캐시 있으면 스피너 생략

  useEffect(() => {
    const { data: { subscription } } = db.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          const su = session.user;
          const name =
            su.user_metadata?.full_name ||
            su.user_metadata?.name ||
            su.email?.split('@')[0] ||
            '사용자';
          let dbUser = null;
          try {
            dbUser = await upsertUser(su.id, name, su.email);
          } catch {
            dbUser = await getCurrentUser();
          }
          writeCache(dbUser);
          setUser(dbUser);
        } else {
          clearCache();
          setUser(null);
        }
      } catch {
        clearCache();
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await db.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
