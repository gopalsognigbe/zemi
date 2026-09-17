import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { THEME_PREFERENCE_KEY } from '@/constants/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemePreferenceContextValue {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  ready: boolean;
}

export const ThemePreferenceContext =
  createContext<ThemePreferenceContextValue>({
    preference: 'system',
    setPreference: () => undefined,
    ready: false,
  });

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemePreferenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const stored = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (mounted && isThemePreference(stored)) {
          setPreferenceState(stored);
        }
      } finally {
        if (mounted) setReady(true);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    void AsyncStorage.setItem(THEME_PREFERENCE_KEY, value);
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference, ready }),
    [preference, setPreference, ready],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue {
  return useContext(ThemePreferenceContext);
}
