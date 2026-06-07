'use client';

import { useEffect, useState } from 'react';
import { AuthContext, User } from '@/lib/auth';
import { authAPI } from '@/lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        const response = await authAPI.getMe();
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (error) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    if (response.data.requires_2fa) {
      return { requires_2fa: true, user_id: response.data.user_id };
    }
    setUser(response.data.user);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    localStorage.setItem('auth_token', response.data.token);
    return { requires_2fa: false, user_id: 0 };
  };

  const verify2FA = async (userId: number, otp: string) => {
    const response = await authAPI.verify2FA(userId, otp);
    setUser(response.data.user);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    localStorage.setItem('auth_token', response.data.token);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        verify2FA,
        logout,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
