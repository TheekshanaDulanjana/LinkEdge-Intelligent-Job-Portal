import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { secureStorage } from './secureStorage';

const REQUEST_TIMEOUT = 30000; // 30 seconds

// Safe UUID generator fallback for non-secure / older browser contexts
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Factory function to create API instances with shared interceptors
function createApiInstance(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: REQUEST_TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: false,
  });

  // Interceptor to attach token and request ID to every outgoing request
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = secureStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracing across microservices
    config.headers['X-Request-Id'] = generateUUID();
    return config;
  });

  // Interceptor to handle global response errors
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // 401 on a request that carried a token means the session has ended.
      // Clear it, and send the user to the login page only when they are on a
      // page that needs a login (public pages such as the job board stay open).
      const hadToken = !!error.config?.headers?.Authorization;
      if (error.response?.status === 401 && hadToken) {
        secureStorage.clear();

        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path.startsWith('/admin') && path !== '/admin/login') {
            window.location.href = '/admin/login?reason=expired';
            return Promise.reject({ name: 'ApiError', message: 'Your session has ended.', statusCode: 401 });
          }
          const needsLogin =
            path.startsWith('/seeker') ||
            path.startsWith('/settings') ||
            /^\/company\/(dashboard|jobs|candidates|analytics|calendar|post-job|profile)(\/|$)/.test(path);
          if (needsLogin) {
            window.location.href = '/login?reason=expired';
          }
        }
      }

      // Preserve full response details while standardizing error structure
      const safeError = {
        name: 'ApiError',
        message:
          error.response?.data?.message ||
          error.message ||
          'Something went wrong. Please try again.',
        statusCode: error.response?.status || 500,
        requestId: error.response?.headers?.['x-request-id'],
        response: error.response, // Attached so components can inspect error.response directly
      };

      return Promise.reject(safeError);
    }
  );

  return instance;
}

// Auth service
export const authApi = createApiInstance(
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001/api/v1'
);

// Admin back-office (same service as auth, /admin routes)
export const adminApi = createApiInstance(
  `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001/api/v1'}/admin`
);

// Job service
export const jobApi = createApiInstance(
  process.env.NEXT_PUBLIC_JOB_SERVICE_URL || 'http://localhost:3002/api/v1'
);

// Application service
export const applicationApi = createApiInstance(
  process.env.NEXT_PUBLIC_APPLICATION_SERVICE_URL || 'http://localhost:3003/api/v1'
);

// ATS service
export const atsApi = createApiInstance(
  process.env.NEXT_PUBLIC_ATS_SERVICE_URL || 'http://localhost:8003/api/v1'
);

export default authApi;