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
    token: string;
}

// Authentication API calls
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

    getProfile: async (): Promise<{ user: User }> => {
        const response = await api.get('auth/me');
        return response.data;
    },

    updateProfile: async (data: Partial<User>): Promise<{ message: string; user: User }> => {
        const response = await api.put('auth/me', data);
        return response.data;
    },

    refreshToken: async (): Promise<{ message: string; token: string }> => {
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

// Helper functions
export const setAuthToken = (token: string) => {
    localStorage.setItem('token', token);
};

export const setUser = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
};

export const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
};

export const getStoredUser = (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

export const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

export const isAuthenticated = (): boolean => {
    return !!getAuthToken();
};
