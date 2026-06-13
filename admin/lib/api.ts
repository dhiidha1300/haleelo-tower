import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Automatically include cookies in requests
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add token to every request from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// On 401, clear the stored token and let the caller handle the redirect.
// Do NOT call window.location.href here — that causes infinite loops on
// public pages (e.g. login page calls /api/auth/me, gets 401, interceptor
// reloads the login page, repeat forever).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
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
  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),
  resetPassword: (email: string, token: string, password: string, password_confirmation: string, invite = false) =>
    api.post('/api/auth/reset-password', { email, token, password, password_confirmation, invite }),
  sendResetLink: (userId: number) =>
    api.post(`/api/users/${userId}/send-reset-link`),
  resendInvite: (userId: number) =>
    api.post(`/api/users/${userId}/resend-invite`),
  resendOtp: (userId: number) =>
    api.post('/api/auth/2fa/resend', { user_id: userId }),
  updateProfile: (data: { name?: string; phone?: string; current_password?: string; new_password?: string; new_password_confirmation?: string }) =>
    api.put('/api/auth/profile', data),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post('/api/auth/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ─── v3.1: Notifications + Global Search ─────────────────────────────────────
export const notificationsAPI = {
  list: () => api.get('/api/notifications'),
};
export const searchAPI = {
  query: (q: string) => api.get('/api/search', { params: { q } }),
};

export const userAPI = {
  list: (page = 1, search = '', role = '', status = '') =>
    api.get('/api/users', { params: { page, search, role, status } }),
  create: (data: any) => api.post('/api/users', data),
  show: (id: number) => api.get(`/api/users/${id}`),
  getById: (id: number) => api.get(`/api/users/${id}`),
  update: (id: number, data: any) => api.put(`/api/users/${id}`, data),
  delete: (id: number) => api.delete(`/api/users/${id}`),
  reactivate: (id: number) => api.post(`/api/users/${id}/reactivate`),
  unlock: (id: number) => api.post(`/api/users/${id}/unlock`),
};

export const settingsAPI = {
  getAll: () => api.get('/api/settings'),
  update: (settings: any[]) => api.put('/api/settings', { settings }),
  updateSingle: (key: string, value: string, description?: string) =>
    api.put(`/api/settings/${key}`, { value, description }),
  getCategory: (category: string) =>
    api.get(`/api/settings-category/${category}`),
};

export const electricityAPI = {
  list: () => api.get('/api/electricity-rates'),
  create: (rate_per_kwh: string, effective_from: string) =>
    api.post('/api/electricity-rates', { rate_per_kwh, effective_from }),
};

export const emailAPI = {
  test: (email: string) => api.post('/api/email/test', { email }),
};

export const cateringAPI = {
  list: () => api.get('/api/catering-packages'),
  create: (data: any) => api.post('/api/catering-packages', data),
  update: (id: number, data: any) => api.put(`/api/catering-packages/${id}`, data),
  toggle: (id: number) => api.patch(`/api/catering-packages/${id}/toggle`),
  destroy: (id: number) => api.delete(`/api/catering-packages/${id}`),
};

export const dashboardAPI = {
  stats: () => api.get('/api/dashboard/stats'),
  charts: () => api.get('/api/dashboard/charts'),
};

// ─── Phase 3e: HR & Payroll ─────────────────────────────────────────────────
export const employeesAPI = {
  list:   (params?: Record<string, string>) => api.get('/api/employees', { params }),
  show:   (id: number) => api.get(`/api/employees/${id}`),
  create: (data: any) => api.post('/api/employees', data),
  update: (id: number, data: any) => api.put(`/api/employees/${id}`, data),
  destroy:(id: number) => api.delete(`/api/employees/${id}`),
  uploadContract: (id: number, file: File) => {
    const form = new FormData();
    form.append('contract', file);
    return api.post(`/api/employees/${id}/contract`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const attendanceAPI = {
  list: (month: string) => api.get('/api/attendance', { params: { month } }),
  save: (data: any) => api.post('/api/attendance', data),
};

export const leaveAPI = {
  list:     (params?: Record<string, string>) => api.get('/api/leave-requests', { params }),
  show:     (id: number) => api.get(`/api/leave-requests/${id}`),
  create:   (data: any) => api.post('/api/leave-requests', data),
  decision: (id: number, status: 'approved' | 'rejected') => api.post(`/api/leave-requests/${id}/decision`, { status }),
};

export const payrollAPI = {
  runs:          (params?: Record<string, string>) => api.get('/api/payroll/runs', { params }),
  showRun:       (id: number) => api.get(`/api/payroll/runs/${id}`),
  createRun:     (data: any) => api.post('/api/payroll/runs', data),
  updatePayslip: (id: number, data: any) => api.put(`/api/payroll/payslips/${id}`, data),
  payslipItems:  (id: number) => api.get(`/api/payroll/payslips/${id}/items`),
  addOvertime:   (id: number, data: any) => api.post(`/api/payroll/payslips/${id}/overtime`, data),
  removeOvertime:(id: number, otId: number) => api.delete(`/api/payroll/payslips/${id}/overtime/${otId}`),
  addDeduction:  (id: number, data: any) => api.post(`/api/payroll/payslips/${id}/deductions`, data),
  removeDeduction:(id: number, dId: number) => api.delete(`/api/payroll/payslips/${id}/deductions/${dId}`),
  finalize:      (id: number, paymentAccountId: number) => api.post(`/api/payroll/runs/${id}/finalize`, { payment_account_id: paymentAccountId }),
  void:          (id: number) => api.post(`/api/payroll/runs/${id}/void`),
  payslipPdf:    (id: number) => api.get(`/api/payroll/payslips/${id}/pdf`, { responseType: 'blob' }),
};

// ─── Phase 3d: Reports ──────────────────────────────────────────────────────
export const reportsAPI = {
  data:   (type: string, params?: Record<string, string>) => api.get(`/api/reports/${type}`, { params }),
  export: (type: string, format: 'pdf' | 'excel', params?: Record<string, string>) =>
    api.get(`/api/reports/${type}/export`, { params: { format, ...params }, responseType: 'blob' }),
};

// ─── Phase 2: Products ──────────────────────────────────────────────────────
export const productsAPI = {
  floors: () => api.get('/api/floors'),
  list: (params?: Record<string, string>) => api.get('/api/products', { params }),
  show: (id: number) => api.get(`/api/products/${id}`),
  create: (data: any) => api.post('/api/products', data),
  update: (id: number, data: any) => api.put(`/api/products/${id}`, data),
  toggle: (id: number) => api.post(`/api/products/${id}/toggle`),
  uploadPhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post(`/api/products/${id}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deletePhoto: (id: number, photoUrl: string) =>
    api.delete(`/api/products/${id}/photos`, { data: { photo_url: photoUrl } }),
  reorderPhotos: (id: number, photos: string[]) =>
    api.put(`/api/products/${id}/photos/reorder`, { photos }),
  getServices: (id: number) => api.get(`/api/products/${id}/services`),
  addService: (id: number, data: any) => api.post(`/api/products/${id}/services`, data),
  updateService: (id: number, serviceId: number, data: any) =>
    api.put(`/api/products/${id}/services/${serviceId}`, data),
  deleteService: (id: number, serviceId: number) =>
    api.delete(`/api/products/${id}/services/${serviceId}`),
};

// ─── Phase 2: Bookings ──────────────────────────────────────────────────────
export const bookingsAPI = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get('/api/bookings', { params }),
  calendar: (start: string, end: string) =>
    api.get('/api/bookings/calendar', { params: { start, end } }),
  show: (id: number) => api.get(`/api/bookings/${id}`),
  create: (data: any) => api.post('/api/bookings', data),
  updateStatus: (id: number, status: string, notes?: string, rejectionReason?: string) =>
    api.post(`/api/bookings/${id}/status`, { status, notes, rejection_reason: rejectionReason }),
  checkAvailability: (data: any) => api.post('/api/bookings/availability', data),
  cancelSeries: (id: number, scope: 'single' | 'future' | 'all') =>
    api.post(`/api/bookings/${id}/cancel-series`, { scope }),
  waitingList: (productId?: number) =>
    api.get('/api/waiting-list', productId ? { params: { product_id: productId } } : {}),
  addToWaitingList: (data: any) => api.post('/api/waiting-list', data),
};

// ─── Phase 2: Tenants ───────────────────────────────────────────────────────
export const tenantsAPI = {
  list: (params?: Record<string, string>) => api.get('/api/tenants', { params }),
  show: (id: number) => api.get(`/api/tenants/${id}`),
  create: (data: any) => api.post('/api/tenants', data),
  update: (id: number, data: any) => api.put(`/api/tenants/${id}`, data),
  destroy: (id: number) => api.delete(`/api/tenants/${id}`),
  uploadDocument: (id: number, file: File, type: string, expiryDate?: string) => {
    const form = new FormData();
    form.append('document', file);
    form.append('type', type);
    if (expiryDate) form.append('expiry_date', expiryDate);
    return api.post(`/api/tenants/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  generatePortalCredentials: (id: number) =>
    api.post(`/api/tenants/${id}/portal-credentials`),
};

// ─── Phase 2: Leases ────────────────────────────────────────────────────────
export const leasesAPI = {
  list: (params?: Record<string, string>) => api.get('/api/leases', { params }),
  show: (id: number) => api.get(`/api/leases/${id}`),
  create: (data: any) => api.post('/api/leases', data),
  update: (id: number, data: any) => api.put(`/api/leases/${id}`, data),
  terminate: (id: number, reason?: string) =>
    api.post(`/api/leases/${id}/terminate`, { reason }),
  approve: (id: number) => api.post(`/api/leases/${id}/approve`),
  reject: (id: number, reason: string) => api.post(`/api/leases/${id}/reject`, { reason }),
  uploadDocument: (id: number, file: File, docType: 'contract' | 'external_contract') => {
    const form = new FormData();
    form.append('document', file);
    form.append('doc_type', docType);
    return api.post(`/api/leases/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Phase 3a: Accounting ───────────────────────────────────────────────────
export const accountingAPI = {
  chartOfAccounts: () => api.get('/api/chart-of-accounts'),
  createAccount:   (data: any) => api.post('/api/chart-of-accounts', data),
  updateAccount:   (id: number, data: any) => api.put(`/api/chart-of-accounts/${id}`, data),
  deleteAccount:   (id: number) => api.delete(`/api/chart-of-accounts/${id}`),

  accounts:        () => api.get('/api/accounts'),
  accountTransactions: (id: number, params?: Record<string, string>) =>
    api.get(`/api/accounts/${id}/transactions`, { params }),
  transfer:        (data: any) => api.post('/api/accounts/transfer', data),
  transferReceipt: (journalEntryId: number) => api.get(`/api/accounts/transfer/${journalEntryId}/receipt`, { responseType: 'blob' }),

  journal:         (params?: Record<string, string>) => api.get('/api/journal', { params }),
  journalEntry:    (id: number) => api.get(`/api/journal/${id}`),
  createJournal:   (data: any) => api.post('/api/journal', data),
  trialBalance:    (asOf?: string) => api.get('/api/journal/trial-balance', { params: asOf ? { as_of: asOf } : {} }),
};

// ─── Phase 3b: Invoices & Payments ──────────────────────────────────────────
export const invoicesAPI = {
  list:    (params?: Record<string, string>) => api.get('/api/invoices', { params }),
  show:    (id: number) => api.get(`/api/invoices/${id}`),
  create:  (data: any) => api.post('/api/invoices', data),
  send:    (id: number) => api.post(`/api/invoices/${id}/send`),
  destroy: (id: number) => api.delete(`/api/invoices/${id}`),
  pdf:     (id: number) => api.get(`/api/invoices/${id}/pdf`, { responseType: 'blob' }),
  recordPayment: (id: number, data: any) => api.post(`/api/invoices/${id}/payments`, data),
};

export const paymentsAPI = {
  list: (params?: Record<string, string>) => api.get('/api/payments', { params }),
  voucher: (id: number) => api.get(`/api/payments/${id}/voucher`, { responseType: 'blob' }),
  receiveDeposit: (depositId: number, data: any) => api.post(`/api/security-deposits/${depositId}/receive`, data),
  returnDeposit: (depositId: number, data: any) => api.post(`/api/security-deposits/${depositId}/return`, data),
};

// ─── Phase 3c: Procurement, Expenses, Electricity ───────────────────────────
export const vendorsAPI = {
  list:    (params?: Record<string, string>) => api.get('/api/vendors', { params }),
  show:    (id: number) => api.get(`/api/vendors/${id}`),
  create:  (data: any) => api.post('/api/vendors', data),
  update:  (id: number, data: any) => api.put(`/api/vendors/${id}`, data),
  destroy: (id: number) => api.delete(`/api/vendors/${id}`),
};

export const purchaseOrdersAPI = {
  list:   (params?: Record<string, string>) => api.get('/api/purchase-orders', { params }),
  show:   (id: number) => api.get(`/api/purchase-orders/${id}`),
  create: (data: any) => api.post('/api/purchase-orders', data),
  updateStatus: (id: number, status: string) => api.post(`/api/purchase-orders/${id}/status`, { status }),
};

export const vendorBillsAPI = {
  list:   (params?: Record<string, string>) => api.get('/api/vendor-bills', { params }),
  show:   (id: number) => api.get(`/api/vendor-bills/${id}`),
  create: (data: FormData) => api.post('/api/vendor-bills', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  pay:    (id: number, data: any) => api.post(`/api/vendor-bills/${id}/pay`, data),
};

export const expensesAPI = {
  list:   (params?: Record<string, string>) => api.get('/api/expenses', { params }),
  show:   (id: number) => api.get(`/api/expenses/${id}`),
  create: (data: FormData) => api.post('/api/expenses', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const electricityReadingsAPI = {
  list:        (params?: Record<string, string>) => api.get('/api/electricity-readings', { params }),
  lastReading: (tenantId: number, spaceId: number) => api.post('/api/electricity-readings/last', { tenant_id: tenantId, space_id: spaceId }),
  record:      (data: any) => api.post('/api/electricity-readings', data),
  generateInvoice: (id: number) => api.post(`/api/electricity-readings/${id}/invoice`),
  draftInvoices:   (id: number) => api.get(`/api/electricity-readings/${id}/draft-invoices`),
  addToInvoice:    (id: number, invoiceId: number) => api.post(`/api/electricity-readings/${id}/add-to-invoice`, { invoice_id: invoiceId }),
};

export const auditAPI = {
  list: (page = 1, action?: string, modelType?: string, userId?: number, startDate?: string, endDate?: string) =>
    api.get('/api/audit-logs', {
      params: { page, action, model_type: modelType, user_id: userId, start_date: startDate, end_date: endDate }
    }),
  users: () => api.get('/api/audit-logs/users'),
  statistics: () => api.get('/api/audit-logs/statistics'),
  export: (format: 'pdf' | 'excel', params: Record<string, string | undefined>) =>
    api.get('/api/audit-logs/export', {
      params: { format, ...params },
      responseType: 'blob',
    }),
};

export default api;
