import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role_code: 'super_admin' | 'lab_admin' | 'pathologist' | 'lab_technician' | 'receptionist' | 'accountant' | string;
  lab_id: string | null;
  lab_name: string;
  branch_id: string | null;
  branch_name: string;
  permissions: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  quickLoginAs: (role: 'super_admin' | 'lab_admin' | 'pathologist' | 'lab_technician' | 'receptionist' | 'accountant') => Promise<void>;
  hasPermission: (perm: string) => boolean;
  isRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('lis_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lis_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.user) {
            setUser(res.user);
            localStorage.setItem('lis_user', JSON.stringify(res.user));
          }
        } catch (e) {
          logout();
        }
      }
      setIsLoading(false);
    }
    verifySession();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('lis_token', res.token);
      localStorage.setItem('lis_user', JSON.stringify(res.user));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lis_token');
    localStorage.removeItem('lis_user');
    localStorage.removeItem('lis_simulated_lab');
    window.location.href = '/login';
  };

  const quickLoginAs = async (role: string) => {
    const demoAccounts: Record<string, { email: string; pass: string }> = {
      super_admin: { email: 'admin@medilabs.com', pass: 'admin123' },
      lab_admin: { email: 'labadmin@apexlabs.com', pass: 'admin123' },
      pathologist: { email: 'pathologist@apexlabs.com', pass: 'admin123' },
      lab_technician: { email: 'technician@apexlabs.com', pass: 'admin123' },
      receptionist: { email: 'reception@apexlabs.com', pass: 'admin123' },
      accountant: { email: 'accountant@apexlabs.com', pass: 'admin123' },
    };

    const target = demoAccounts[role];
    if (target) {
      await login(target.email, target.pass);
    }
  };

  const hasPermission = (perm: string): boolean => {
    if (!user) return false;
    if (user.role_code === 'super_admin') return true;
    return Boolean(user.permissions && user.permissions.includes(perm));
  };

  const isRole = (...roles: string[]): boolean => {
    if (!user) return false;
    if (user.role_code === 'super_admin') return true;
    return roles.includes(user.role_code);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        logout,
        quickLoginAs,
        hasPermission,
        isRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
