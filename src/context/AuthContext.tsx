import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Role, UserProfile } from '@/types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  role: Role;
  canEditProducts: boolean;
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  refreshClaims: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<Role>('customer');
  const [canEditProducts, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  async function readClaims(u: User | null, force = false) {
    if (!u) {
      setRole('customer');
      setCanEdit(false);
      return;
    }
    const token = await u.getIdTokenResult(force);
    const r = token.claims.role;
    setRole(r === 'admin' || r === 'seller' ? r : 'customer');
    setCanEdit(token.claims.canEditProducts === true);
  }

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    const unsub = onAuthStateChanged(auth, async (u) => {
      unsubProfile?.();
      setUser(u);
      await readClaims(u);
      if (u) {
        unsubProfile = onSnapshot(
          doc(db, 'users', u.uid),
          (snap) => {
            setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
            setLoading(false);
          },
          () => setLoading(false),
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      unsub();
      unsubProfile?.();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      role,
      canEditProducts,
      loading,
      isStaff: role === 'admin' || role === 'seller',
      isAdmin: role === 'admin',
      refreshClaims: () => readClaims(user, true),
    }),
    [user, profile, role, canEditProducts, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fora do AuthProvider');
  return v;
}
