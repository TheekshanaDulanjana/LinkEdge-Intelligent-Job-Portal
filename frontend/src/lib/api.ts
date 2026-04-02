import axios from 'axios';

/* =========================================================
   AUTH SERVICE API (Port 3001)
   ========================================================= */

// All requests automatically go to your auth-service
const api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token before every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;


/* =========================================================
   JOB SERVICE API (Port 3002)
   ========================================================= */

export const jobApi = axios.create({
  baseURL: 'http://localhost:3002/api/v1',
  headers: { 'Content-Type': 'application/json' },
});


/* =========================================================
   APPLICATION SERVICE API (Port 3003)
   ========================================================= */

export const applicationApi = axios.create({
  baseURL: 'http://localhost:3003/api/v1',
  headers: { 'Content-Type': 'application/json' },
});


/* =========================================================
   COMMON INTERCEPTOR (Attach Token to All Services)
   ========================================================= */

[jobApi, applicationApi].forEach((instance) => {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
});