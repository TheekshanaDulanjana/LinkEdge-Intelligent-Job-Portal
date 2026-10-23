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
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth: (user, accessToken) => {
    secureStorage.setTokens(accessToken, user);
    set({ user, accessToken, isAuthenticated: true });
  },

  logout: () => {
    secureStorage.clear();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    const token = secureStorage.getAccessToken();
    const user = secureStorage.getUser<User>();
    if (token && user) {
      set({ accessToken: token, user, isAuthenticated: true });
    }
  },
}));