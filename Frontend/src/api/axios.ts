import axios from 'axios';

// In development the Vite proxy forwards /api/* to localhost:5000 — no CORS.
// In production VITE_API_URL should be the full URL: https://api.yourdomain.com/api
const rawUrl = import.meta.env.VITE_API_URL || '/api';
const API_BASE_URL = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    // Send the HttpOnly cookie automatically with every request
    withCredentials: true,
});

// Request interceptor — remove Content-Type for FormData so the browser sets the boundary
api.interceptors.request.use(
    (config) => {
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear stored user data (cookie is cleared server-side via /auth/logout)
            localStorage.removeItem('user');

            const isLoginRequest = error.config?.url?.includes('login');
            if (!isLoginRequest && window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
