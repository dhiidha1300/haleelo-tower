import { useAuth } from './auth';

export function usePermission() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions?.includes(permission) ?? false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.some(p => user.permissions?.includes(p));
  };

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    const list = Array.isArray(roles) ? roles : [roles];
    return list.includes(user.role);
  };

  const isSuperAdmin = hasRole('super_admin');
  const isAdmin      = hasRole('admin');
  const isOperations = hasRole('operations');
  const isFinance    = hasRole('finance');

  return {
    hasPermission,
    hasAnyPermission,
    hasRole,
    isSuperAdmin,
    isAdmin,
    isOperations,
    isFinance,
    role: user?.role ?? '',
    permissions: user?.permissions ?? [],
  };
}
