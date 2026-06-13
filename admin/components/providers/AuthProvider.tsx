'use client';

import { useState, useEffect } from 'react';
import { AuthContext, User } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import api from '@/lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
    } catch (error) {
      // 401 interceptor already cleared localStorage. Just reset state here.
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);

    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    }

    if (!response.data.requires_2fa && response.data.user) {
      setUser(response.data.user);
    }

    return response.data;
  };

  const verify2FA = async (userId: number, otp: string) => {
    const response = await authAPI.verify2FA(userId, otp);

    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    }

    if (response.data.user) {
      setUser(response.data.user);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {}
    localStorage.removeItem('auth_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
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
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
