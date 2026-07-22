import type { AuthUser } from '@/types';
import { loginApi } from './api';

export async function login(
  employeeId: string,
  password: string,
  companyCode: string
): Promise<AuthUser | null> {
  try {
    const response = await loginApi(employeeId, password, companyCode);
    const data = response.data;

    const user: AuthUser = {
      employeeId: data.user.employee_id,
      name: data.user.full_name,
      role: data.user.role,
      companyId: data.user.company_id,
      companyName: data.user.company?.name || '',
      token: data.access_token,
    };

    return user;
  } catch (error) {
    console.error('Login failed:', error);
    return null;
  }
}

export function saveAuth(user: AuthUser): void {
  localStorage.setItem('sos_user', JSON.stringify(user));
  localStorage.setItem('sos_token', user.token);
}

export function getAuth(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('sos_user');
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export function logout(): void {
  localStorage.removeItem('sos_user');
  localStorage.removeItem('sos_token');
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sos_token');
}