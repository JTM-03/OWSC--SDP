import { createContext, useContext, useState, useEffect } from 'react';
import { User, authAPI, setUser, getStoredUser, clearStoredUser } from '../api/auth';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (data: Partial<User>) => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext(undefined as AuthContextType | undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUserState] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // On mount: if we have a stored user, verify the cookie is still valid
    useEffect(() => {
        const initAuth = async () => {
            const storedUser = getStoredUser();
            if (storedUser) {
                try {
                    // Cookie is sent automatically — this confirms it's still valid
                    const { user: freshUser } = await authAPI.getProfile();
                    setUserState(freshUser);
                    setUser(freshUser);
                } catch {
                    // Cookie expired or invalid — clean up local state
                    clearStoredUser();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await authAPI.login({ email, password });
            // Cookie is set by the server automatically
            setUser(response.user);
            setUserState(response.user);
            toast.success('Login successful!');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Login failed');
            throw error;
        }
    };

    const register = async (data: any) => {
        try {
            const response = await authAPI.register(data);
            setUser(response.user);
            setUserState(response.user);
            toast.success('Registration successful!');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Registration failed');
            throw error;
        }
    };

    const logout = async () => {
        try {
            // Tell the server to clear the cookie
            await authAPI.logout();
        } catch {
            // Even if the request fails, clear local state
        }
        clearStoredUser();
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
            toast.error(error.response?.data?.error || 'Update failed');
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
