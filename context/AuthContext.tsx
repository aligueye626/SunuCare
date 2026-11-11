import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { authService } from '@/services/authService';
import { AuthUser, RegisterData, UserRole } from '@/types/user';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore persistent session upon app launch
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const sessionUser = await authService.getCurrentSessionUser();
        if (isMounted) {
          setUser(sessionUser);
        }
      } catch (err) {
        console.warn('Failed to restore persistent session:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Protected Routes & Role-based Routing Guard
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inDoctorSpace = segments[0] === 'doctor-space';
    const inAdminSpace = (segments[0] as string) === 'admin-space';
    const isWelcomeScreen = !segments[0] || (segments[0] as string) === 'index';

    if (!user) {
      // If unauthenticated and trying to access protected doctor or admin space, send to login
      if (inDoctorSpace || inAdminSpace) {
        router.replace('/(auth)/login');
      }
    } else {
      // Prevent non-admins from accessing Admin Space
      if (user.role !== 'admin' && inAdminSpace) {
        if (user.role === 'doctor') {
          router.replace('/doctor-space/dashboard');
        } else {
          router.replace('/(tabs)');
        }
        return;
      }

      // Prevent patients or admins from accessing Doctor Space
      if (user.role !== 'doctor' && inDoctorSpace) {
        if (user.role === 'admin') {
          router.replace('/admin-space/dashboard' as any);
        } else {
          router.replace('/(tabs)');
        }
        return;
      }

      // If authenticated and on Welcome or Auth screens, route to appropriate space
      if (inAuthGroup || isWelcomeScreen) {
        if (user.role === 'admin') {
          router.replace('/admin-space/dashboard' as any);
        } else if (user.role === 'doctor') {
          router.replace('/doctor-space/dashboard');
        } else {
          router.replace('/(tabs)');
        }
      }
    }
  }, [user, segments, isLoading]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(email, pass);
      if (response.error || !response.user) {
        setIsLoading(false);
        return { success: false, error: response.error || 'Erreur de connexion.' };
      }

      setUser(response.user);
      setIsLoading(false);

      // Role-Based Navigation
      if (response.user.role === 'admin') {
        router.replace('/admin-space/dashboard' as any);
      } else if (response.user.role === 'doctor') {
        router.replace('/doctor-space/dashboard');
      } else {
        router.replace('/(tabs)');
      }

      return { success: true };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e.message || 'Erreur inconnue.' };
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      if (response.error || !response.user) {
        setIsLoading(false);
        return { success: false, error: response.error || 'Erreur lors de l’inscription.' };
      }

      setUser(response.user);
      setIsLoading(false);

      // Role-Based Navigation
      if (response.user.role === 'doctor') {
        router.replace('/doctor-space/dashboard');
      } else {
        router.replace('/(tabs)');
      }

      return { success: true };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e.message || 'Erreur inconnue.' };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      router.replace('/');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    return authService.resetPassword(email);
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    try {
      const updated = await authService.updateProfile(updates);
      if (updated) {
        setUser(updated);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    role: user ? user.role : null,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
