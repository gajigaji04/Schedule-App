'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/supabase';
import { upsertUser, getCurrentUser } from '@/models/userModel';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChange가 mount 직후 INITIAL_SESSION 이벤트를 즉시 발행하므로
    // 이것 하나로 초기 상태 + 이후 변경 모두 처리한다.
    const { data: { subscription } } = db.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          const su = session.user;
          const name =
            su.user_metadata?.full_name ||
            su.user_metadata?.name ||
            su.email?.split('@')[0] ||
            '사용자';
          // upsert 실패 시 기존 유저 조회로 폴백
          let dbUser = null;
          try {
            dbUser = await upsertUser(su.id, name, su.email);
          } catch {
            dbUser = await getCurrentUser();
          }
          setUser(dbUser);
        } else {
          setUser(null);
        }
      } catch {
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
