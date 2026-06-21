import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, UserProfile, AppRole } from './supabase';

type WriteModule = 'stock' | 'treatment' | 'safety' | 'training' | 'admin' | 'commercial' | 'logistics';

interface UserContextValue {
  profile: UserProfile | null;
  role: AppRole | null;
  isAdmin: boolean;
  isManagement: boolean;
  isOperator: boolean;
  isStockController: boolean;
  isLogisticsManager: boolean;
  isCustomer: boolean;
  clientId: string | null;
  canWrite: (module: WriteModule) => boolean;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({
  profile: null,
  role: null,
  isAdmin: false,
  isManagement: false,
  isOperator: false,
  isStockController: false,
  isLogisticsManager: false,
  isCustomer: false,
  clientId: null,
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
  - logistics_manager: logistics only ✓
  - production:       treatment only ✓
  - operator:         treatment only ✓ (shift entry)
  - viewer:           none ✗
  - customer:         none ✗ (portal is read-only, own data via RLS view)
*/
function resolveCanWrite(role: AppRole | null, module: WriteModule): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  if (role === 'management') return module !== 'admin';
  if (role === 'stock_controller') return module === 'stock';
  if (role === 'logistics_manager') return module === 'logistics';
  if (role === 'production') return module === 'treatment';
  if (role === 'operator') return module === 'treatment';
  return false; // viewer, customer
}

export function UserProvider({ session, children }: { session: Session; children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchProfile() {
      try {
        // select('*') (not an explicit column list) so the app keeps working if a
        // newly-added column (e.g. portal_access_mode) isn't migrated on the DB yet —
        // naming a missing column makes PostgREST fail the whole query.
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (!mounted) return;
        if (data && !data.is_active) {
          await supabase.auth.signOut();
          return;
        }
        setProfile(data ?? null);
      } catch {
        if (mounted) setProfile(null);
      } finally {
        if (mounted) setLoading(false);
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
    isOperator: role === 'operator',
    isStockController: role === 'stock_controller',
    isLogisticsManager: role === 'logistics_manager',
    isCustomer: role === 'customer',
    clientId: profile?.client_id ?? null,
    canWrite: (module) => resolveCanWrite(role, module),
    loading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
