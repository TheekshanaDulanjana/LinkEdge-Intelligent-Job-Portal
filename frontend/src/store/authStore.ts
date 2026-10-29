import { create } from 'zustand';
import { secureStorage } from '@/lib/secureStorage';

interface User {
  id: string;
  email: string;
  role: 'SEEKER' | 'COMPANY';
  profile: Record<string, unknown>;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** true once the saved session has been read from storage (guards must wait for it) */
  isHydrated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
  setToken: (accessToken: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: (user, accessToken) => {
    secureStorage.setTokens(accessToken, user);
    set({ user, accessToken, isAuthenticated: true, isHydrated: true });
  },

  logout: () => {
    secureStorage.clear();
    set({ user: null, accessToken: null, isAuthenticated: false, isHydrated: true });
  },

  loadFromStorage: () => {
    const token = secureStorage.getAccessToken();
    const user = secureStorage.getUser<User>();
    if (token && user) {
      set({ accessToken: token, user, isAuthenticated: true, isHydrated: true });
    } else {
      set({ isHydrated: true });
    }
  },

  setToken: (accessToken) => {
    secureStorage.setAccessToken(accessToken);
    set({ accessToken });
  },
}));