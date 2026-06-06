import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, UserProfile, AppRole } from './supabase';

interface UserContextValue {
  profile: UserProfile | null;
  role: AppRole | null;
  isAdmin: boolean;
  isManagement: boolean;
  canWrite: (module: 'stock' | 'treatment' | 'safety' | 'training' | 'admin') => boolean;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({
  profile: null,
  role: null,
  isAdmin: false,
  isManagement: false,
  canWrite: () => false,
  loading: true,
});

export function useUser() {
  return useContext(UserContext);
}

/*
  Write permissions by role and module:
  - admin:            all modules ✓
  - management:       all except admin ✓
  - stock_controller: stock only ✓
  - production:       treatment only ✓
  - viewer:           none ✗
*/
function resolveCanWrite(role: AppRole | null, module: 'stock' | 'treatment' | 'safety' | 'training' | 'admin'): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  if (role === 'management') return module !== 'admin';
  if (role === 'stock_controller') return module === 'stock';
  if (role === 'production') return module === 'treatment';
  return false; // viewer
}

export function UserProvider({ session, children }: { session: Session; children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchProfile() {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, auth_user_id, display_name, role, is_active, created_at, updated_at')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (mounted) {
        setProfile(data ?? null);
        setLoading(false);
      }
    }

    fetchProfile();
    return () => { mounted = false; };
  }, [session.user.id]);

  const role = profile?.role ?? null;

  const value: UserContextValue = {
    profile,
    role,
    isAdmin: role === 'admin',
    isManagement: role === 'management',
    canWrite: (module) => resolveCanWrite(role, module),
    loading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
