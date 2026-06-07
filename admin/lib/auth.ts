import { createContext, useContext } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  job_title: string;
  phone: string;
  status: string;
  profile_photo_url?: string;
  role: string;
  permissions: string[];
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ requires_2fa: boolean; user_id: number }>;
  verify2FA: (userId: number, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const usePermission = (permission: string) => {
  const { user } = useAuth();
  if (!user) return false;
  return user.permissions.includes(permission);
};

export const useRole = (role: string | string[]) => {
  const { user } = useAuth();
  if (!user) return false;
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(user.role);
};
