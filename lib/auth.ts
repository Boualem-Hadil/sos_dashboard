import type { AuthUser } from '@/types';

const MOCK_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJBRE0wMDEiLCJuYW1lIjoiS2FtZWwgQmVuYWxpIiwiY29tcGFueUlkIjoic25hdHJhY2giLCJyb2xlIjoiYWRtaW4ifQ.mock';

export function login(employeeId: string, _password: string, companyCode: string): AuthUser | null {
  const companies: Record<string, { id: string; name: string }> = {
    SNTR: { id: 'sonatrach', name: 'Sonatrach' },
    CVTL: { id: 'cevital', name: 'CEVITAL' },
    ARCL: { id: 'arcelormittal', name: 'ArcelorMittal' },
  };
  const company = companies[companyCode.toUpperCase()];
  if (!company) return null;
  const user: AuthUser = {
    employeeId,
    name: 'Kamel Benali',
    role: 'Responsable Sécurité',
    companyId: company.id,
    companyName: company.name,
    token: MOCK_JWT,
  };
  return user;
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
