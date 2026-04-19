import api from './axios';

export interface User {
    id: number;
    fullName: string;
    email: string;
    username: string;
    role: 'member' | 'staff' | 'admin';
    phone?: string;
    address?: string;
    nic?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    status: string;
    password?: string;
}

export interface RegisterData {
    fullName: string;
    email: string;
    username: string;
    password: string;
    phone?: string;
    address?: string;
    nic?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    role?: 'member' | 'staff' | 'admin';
    membershipType?: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface AuthResponse {
    message: string;
    user: User;
    // token is no longer returned — it lives in the HttpOnly cookie
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const authAPI = {
    register: async (data: RegisterData | FormData): Promise<AuthResponse> => {
        const isFormData = data instanceof FormData;
        const response = await api.post('auth/register', data, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
        });
        return response.data;
    },

    login: async (data: LoginData): Promise<AuthResponse> => {
        const response = await api.post('auth/login', data);
        return response.data;
    },

    logout: async (): Promise<void> => {
        await api.post('auth/logout');
    },

    getProfile: async (): Promise<{ user: User }> => {
        const response = await api.get('auth/me');
        return response.data;
    },

    updateProfile: async (data: Partial<User>): Promise<{ message: string; user: User }> => {
        const response = await api.put('auth/me', data);
        return response.data;
    },

    refreshToken: async (): Promise<{ message: string }> => {
        const response = await api.post('auth/refresh');
        return response.data;
    },

    forgotPassword: async (username: string, nic: string): Promise<{ message: string }> => {
        const response = await api.post('auth/forgot-password', { username, nic });
        return response.data;
    },

    verifyOtp: async (username: string, nic: string, otp: string): Promise<{ message: string; resetToken: string }> => {
        const response = await api.post('auth/verify-otp', { username, nic, otp });
        return response.data;
    },

    resetPassword: async (resetToken: string, newPassword: string): Promise<{ message: string }> => {
        const response = await api.post('auth/reset-password', { resetToken, newPassword });
        return response.data;
    },
};

// ─── User storage helpers (localStorage — NOT the token) ─────────────────────
// The JWT token is stored exclusively in an HttpOnly cookie managed by the browser.
// We only persist the user object so the UI can restore state on page refresh
// without an extra network round-trip.

export const setUser = (user: User): void => {
    localStorage.setItem('user', JSON.stringify(user));
};

export const getStoredUser = (): User | null => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
};

export const clearStoredUser = (): void => {
    localStorage.removeItem('user');
};

// ─── Deprecated token helpers (kept as no-ops so old imports don't break) ────
/** @deprecated Token is now in an HttpOnly cookie. This is a no-op. */
export const setAuthToken = (_token: string): void => { /* no-op */ };
/** @deprecated Token is now in an HttpOnly cookie. This is a no-op. */
export const getAuthToken = (): null => null;
/** @deprecated Use clearStoredUser() instead. */
export const clearAuth = (): void => { clearStoredUser(); };

// isAuthenticated can no longer rely on a token in storage.
// Use the AuthContext `isAuthenticated` flag (derived from whether `user` is set).
export const isAuthenticated = (): boolean => !!getStoredUser();
