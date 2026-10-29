// Secure token storage wrapper
// In production you would use httpOnly cookies via the backend
// For this setup we use localStorage with XSS mitigation via CSP headers

const ACCESS_TOKEN_KEY = 'jp_at';   // Abbreviated keys — less obvious
const USER_KEY = 'jp_usr';
const ISSUED_KEY = 'jp_ts';      // when the access token was issued (ms)
const ACTIVITY_KEY = 'jp_la';    // last user activity (ms), shared by all tabs

export const secureStorage = {
  setTokens(accessToken: string, user: object) {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(ISSUED_KEY, String(Date.now()));
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
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
      localStorage.removeItem(ISSUED_KEY);
      localStorage.removeItem(ACTIVITY_KEY);
    } catch {
      console.error('Storage clear failed');
    }
  },

  /** Replace only the access token (used when the session is renewed). */
  setAccessToken(accessToken: string) {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(ISSUED_KEY, String(Date.now()));
    } catch {
      console.error('Storage write failed');
    }
  },

  getIssuedAt(): number {
    try {
      return Number(localStorage.getItem(ISSUED_KEY)) || 0;
    } catch {
      return 0;
    }
  },

  setLastActivity(ts: number = Date.now()) {
    try {
      localStorage.setItem(ACTIVITY_KEY, String(ts));
    } catch {
      /* ignore */
    }
  },

  getLastActivity(): number {
    try {
      return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
    } catch {
      return 0;
    }
  },

  hasSession(): boolean {
    return !!this.getAccessToken();
  },
};