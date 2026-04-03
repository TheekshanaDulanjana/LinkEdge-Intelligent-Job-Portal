import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { secureStorage } from './secureStorage';

const REQUEST_TIMEOUT = 30000; // 30 seconds

function createApiInstance(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: REQUEST_TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
    // Prevent CSRF by not sending cookies automatically
    withCredentials: false,
  });

  // Attach JWT to every request
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = secureStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add request ID for tracing
    config.headers['X-Request-Id'] = crypto.randomUUID();
    return config;
  });

  // Handle auth errors globally
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        secureStorage.clear();
        // Only redirect if not already on auth pages
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')
        ) {
          window.location.href = '/login';
        }
      }

      // Never expose raw error details in production
      const safeError = {
        message:
          error.response?.data?.message ||
          'Something went wrong. Please try again.',
        statusCode: error.response?.status || 500,
        requestId: error.response?.headers?.['x-request-id'],
      };

      return Promise.reject(safeError);
    }
  );

  return instance;
}

// One instance per service
const api = createApiInstance('http://localhost:3001/api/v1');
export const jobApi = createApiInstance('http://localhost:3002/api/v1');
export const applicationApi = createApiInstance('http://localhost:3003/api/v1');

export default api;