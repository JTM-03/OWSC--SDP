import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;

console.log('🚀 [API] Base URL:', API_BASE_URL);
console.log('🚀 [API] Mode:', import.meta.env.MODE);

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        
        console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Only redirect if this wasn't a login attempt
            const isLoginRequest = error.config?.url?.includes('login');
            if (!isLoginRequest) {
                // Also prevent redirect looping if already on the homepage
                if (window.location.pathname !== '/') {
                    window.location.href = '/';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
