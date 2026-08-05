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
      // Clear token and redirect on unauthorized error (401)
      if (error.response?.status === 401) {
        secureStorage.clear();

        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')
        ) {
          window.location.href = '/login';
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

// Auth service (default export)
const api = createApiInstance(
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001/api/v1'
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

export default api;