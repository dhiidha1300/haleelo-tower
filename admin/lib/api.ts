import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  verify2FA: (userId: number, otp: string) =>
    api.post('/api/auth/2fa/verify', { user_id: userId, otp }),
  getMe: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/password/change', {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPassword,
    }),
};

export const userAPI = {
  list: (page: number = 1, search?: string, role?: string, status?: string) =>
    api.get('/api/users', {
      params: { page, search, role, status },
    }),
  create: (data: any) => api.post('/api/users', data),
  show: (id: number) => api.get(`/api/users/${id}`),
  update: (id: number, data: any) => api.put(`/api/users/${id}`, data),
  delete: (id: number) => api.delete(`/api/users/${id}`),
  reactivate: (id: number) => api.post(`/api/users/${id}/reactivate`),
  unlock: (id: number) => api.post(`/api/users/${id}/unlock`),
  resetPassword: (id: number, password: string) =>
    api.post(`/api/users/${id}/reset-password`, { new_password: password }),
};

export const settingsAPI = {
  getAll: () => api.get('/api/settings'),
  get: (key: string) => api.get(`/api/settings/${key}`),
  update: (settings: any[]) =>
    api.put('/api/settings', { settings }),
  updateSingle: (key: string, value: string, description?: string) =>
    api.put(`/api/settings/${key}`, { value, description }),
  getCategory: (category: string) =>
    api.get(`/api/settings-category/${category}`),
};

export const auditAPI = {
  list: (userId?: number, action?: string, modelType?: string, startDate?: string, endDate?: string) =>
    api.get('/api/audit-logs', {
      params: { user_id: userId, action, model_type: modelType, start_date: startDate, end_date: endDate },
    }),
  forModel: (modelType: string, modelId: number) =>
    api.get(`/api/audit-logs/${modelType}/${modelId}`),
  export: (format: string, userId?: number, action?: string, modelType?: string, startDate?: string, endDate?: string) =>
    api.post('/api/audit-logs/export', {
      format,
      user_id: userId,
      action,
      model_type: modelType,
      start_date: startDate,
      end_date: endDate,
    }),
  statistics: () => api.get('/api/audit-logs/statistics'),
};

export default api;
