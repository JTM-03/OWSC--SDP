import { createContext, useContext, useState, useEffect } from 'react';
import { User, authAPI, setAuthToken, setUser, getStoredUser, clearAuth, getAuthToken } from '../api/auth';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
    updateUser: (data: Partial<User>) => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext(undefined as AuthContextType | undefined);

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUserState] = useState(null as User | null);
    const [loading, setLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = getAuthToken();
            const storedUser = getStoredUser();

            if (token && storedUser) {
                try {
                    // Verify token is still valid
                    const { user: freshUser } = await authAPI.getProfile();
                    setUserState(freshUser);
                    setUser(freshUser);
                } catch (error) {
                    // Token invalid, clear auth
                    clearAuth();
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await authAPI.login({ email, password });
            setAuthToken(response.token);
            setUser(response.user);
            setUserState(response.user);
            toast.success('Login successful!');
        } catch (error: any) {
            const message = error.response?.data?.error || 'Login failed';
            toast.error(message);
            throw error;
        }
    };

    const register = async (data: any) => {
        try {
            const response = await authAPI.register(data);
            setAuthToken(response.token);
            setUser(response.user);
            setUserState(response.user);
            toast.success('Registration successful!');
        } catch (error: any) {
            const message = error.response?.data?.error || 'Registration failed';
            toast.error(message);
            throw error;
        }
    };

    const logout = () => {
        clearAuth();
        setUserState(null);
        toast.success('Logged out successfully');
    };

    const updateUser = async (data: Partial<User>) => {
        try {
            const response = await authAPI.updateProfile(data);
            setUser(response.user);
            setUserState(response.user);
            toast.success('Profile updated successfully!');
        } catch (error: any) {
            const message = error.response?.data?.error || 'Update failed';
            toast.error(message);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                updateUser,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
