// Secure token storage wrapper
// In production you would use httpOnly cookies via the backend
// For this setup we use localStorage with XSS mitigation via CSP headers

const ACCESS_TOKEN_KEY = 'jp_at';   // Abbreviated keys — less obvious
const USER_KEY = 'jp_usr';

export const secureStorage = {
  setTokens(accessToken: string, user: object) {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      console.error('Storage write failed');
    }
  },

  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  getUser<T>(): T | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      console.error('Storage clear failed');
    }
  },

  hasSession(): boolean {
    return !!this.getAccessToken();
  },
};