/**
 * Supabase Client Configuration for SunuCare
 * Uses EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * Strategy: Persistent session storage using AsyncStorage for Expo / React Native
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Ensure Node.js < 22 SSR environments (when bundling for Expo Web) do not crash
// when @supabase/realtime-js checks for a global WebSocket constructor.
// Browser and React Native (Expo Go) runtimes already provide native WebSocket.
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class SSRWebSocketFallback {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 3;
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

// SSR-safe storage wrapper: uses AsyncStorage on iOS, Android (Expo Go), and Browser,
// while safely returning null during Node.js server-side rendering where window is undefined.
const isServerWeb = Platform.OS === 'web' && typeof window === 'undefined';

const ssrSafeStorage = {
  getItem: (key: string): Promise<string | null> => {
    if (isServerWeb) return Promise.resolve(null);
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (isServerWeb) return Promise.resolve();
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (isServerWeb) return Promise.resolve();
    return AsyncStorage.removeItem(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder') &&
    supabaseUrl.startsWith('https://')
  );
};

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: ssrSafeStorage,
      autoRefreshToken: !isServerWeb,
      persistSession: !isServerWeb,
      detectSessionInUrl: false,
    },
  }
);

export default supabase;
