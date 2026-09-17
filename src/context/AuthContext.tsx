import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';

import { normalizePhone, toSyntheticEmail } from '@/lib/auth/phone';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

export interface AuthResult {
  error?: string;
}

interface SignUpParams {
  fullName: string;
  phone: string;
  password: string;
  role: UserRole;
}

interface SignInParams {
  phone: string;
  password: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (params: SignUpParams) => Promise<AuthResult>;
  signIn: (params: SignInParams) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
}

interface ProfileRow {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  created_at: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
  };
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'Ce numéro est déjà utilisé.';
  }
  if (lower.includes('user already exists') || lower.includes('duplicate')) {
    return 'Ce numéro est déjà utilisé.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Numéro ou mot de passe incorrect.';
  }
  if (lower.includes('password') && lower.includes('least')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  if (lower.includes('email rate limit')) {
    return 'Trop de tentatives. Réessayez dans quelques minutes.';
  }
  return message || 'Une erreur est survenue. Réessayez.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone, avatar_url, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      setProfile(null);
      return null;
    }

    const mapped = mapProfile(data as ProfileRow);
    setProfile(mapped);
    return mapped;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(currentSession);
      if (currentSession?.user) {
        await loadProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // INITIAL_SESSION est déjà géré par init()
      if (event === 'INITIAL_SESSION') return;

      // Ne pas basculer loading sur refresh token : ça démonte les écrans (suivi de course)
      if (event === 'TOKEN_REFRESHED') {
        setSession(nextSession);
        return;
      }

      setSession(nextSession);

      if (nextSession?.user) {
        // Recharger le profil en arrière-plan sans masquer l'UI si on a déjà un profil
        void loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(
    async ({ fullName, phone, password, role }: SignUpParams): Promise<AuthResult> => {
      const email = toSyntheticEmail(phone);
      const normalized = normalizePhone(phone);

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        return { error: mapAuthError(error.message) };
      }

      const userId = data.user?.id;
      if (!userId) {
        return {
          error:
            'Compte créé mais session absente. Vérifiez que la confirmation e-mail est désactivée dans Supabase.',
        };
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        role,
        full_name: fullName.trim(),
        phone: normalized,
      });

      if (profileError) {
        const msg = profileError.message.toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique')) {
          return { error: 'Ce numéro est déjà utilisé.' };
        }
        return { error: mapAuthError(profileError.message) };
      }

      if (data.session) {
        setSession(data.session);
      }
      await loadProfile(userId);
      return {};
    },
    [loadProfile],
  );

  const signIn = useCallback(
    async ({ phone, password }: SignInParams): Promise<AuthResult> => {
      const email = toSyntheticEmail(phone);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: 'Numéro ou mot de passe incorrect.' };
      }

      if (data.session) {
        setSession(data.session);
        await loadProfile(data.session.user.id);
      }
      return {};
    },
    [loadProfile],
  );

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: mapAuthError(error.message) };
    }
    setSession(null);
    setProfile(null);
    return {};
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    await loadProfile(session.user.id);
  }, [loadProfile, session?.user?.id]);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, signUp, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return context;
}
