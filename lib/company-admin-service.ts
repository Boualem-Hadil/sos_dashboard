'use client';
import { getToken } from './auth';
import type { CompanyAdminStats, Department, OfficerUser, NotificationRecipientCA, Emergency } from '@/types';

// --- Feature flag — flip to false when backend is ready ----
const USE_MOCK = false;

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// --- Mock data ----

const MOCK_STATS: CompanyAdminStats = {
  total_officers: 3,
  total_workers: 14,
  total_departments: 4,
  month_emergencies_open: 1,
  month_emergencies_resolved: 5,
  avg_response_minutes: 18.4,
};

export const MOCK_OFFICERS: OfficerUser[] = [
  { id: 'of1', full_name: 'Kamel Benali', employee_id: 'OF-001', phone: '0770000001', role: 'safety_officer', is_active: true, created_at: '2023-01-10T08:00:00Z', last_seen: new Date(Date.now() - 10 * 60000).toISOString() },
  { id: 'of2', full_name: 'Samira Mokrani', employee_id: 'OF-002', phone: '0770000002', role: 'safety_officer', is_active: true, created_at: '2023-03-22T08:00:00Z', last_seen: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'of3', full_name: 'Hocine Larbi', employee_id: 'OF-003', phone: '0770000003', role: 'safety_officer', is_active: false, created_at: '2022-09-05T08:00:00Z', last_seen: null },
];

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'dep1', company_id: 'sonatrach', name: 'Production', is_active: true, created_at: '2023-01-01T00:00:00Z', units: [
    { id: 'u1', department_id: 'dep1', name: 'Unité A - Raffinage', is_active: true, created_at: '2023-01-01T00:00:00Z' },
    { id: 'u2', department_id: 'dep1', name: 'Unité B - Stockage', is_active: true, created_at: '2023-01-01T00:00:00Z' },
  ]},
  { id: 'dep2', company_id: 'sonatrach', name: 'Extraction', is_active: true, created_at: '2023-01-01T00:00:00Z', units: [
    { id: 'u3', department_id: 'dep2', name: 'Unité C - Forage', is_active: true, created_at: '2023-01-01T00:00:00Z' },
  ]},
  { id: 'dep3', company_id: 'sonatrach', name: 'Maintenance', is_active: true, created_at: '2023-01-01T00:00:00Z', units: [
    { id: 'u4', department_id: 'dep3', name: 'Unité D - Mécanique', is_active: true, created_at: '2023-01-01T00:00:00Z' },
    { id: 'u5', department_id: 'dep3', name: 'Unité E - Électricité', is_active: true, created_at: '2023-01-01T00:00:00Z' },
  ]},
  { id: 'dep4', company_id: 'sonatrach', name: 'Sécurité', is_active: false, created_at: '2022-06-01T00:00:00Z', units: [] },
];

const MOCK_NOTIFICATIONS: NotificationRecipientCA[] = [
  { id: 'nr1', email: 'dg@sonatrach.dz', name: 'Directeur Général', is_active: true, created_at: '2023-01-01T00:00:00Z', company_id: 'sonatrach' },
  { id: 'nr2', email: 'rh@sonatrach.dz', name: 'Responsable RH', is_active: true, created_at: '2023-02-15T00:00:00Z', company_id: 'sonatrach' },
];

const MOCK_HISTORY: any[] = [
  { id: 'h1', type: 'cardiac', status: 'resolved', started_at: new Date(Date.now() - 2 * 86400000).toISOString(), resolved_at: new Date(Date.now() - 2 * 86400000 + 25 * 60000).toISOString(), location_description: 'Zone A', user: { full_name: 'Ahmed Mansouri', employee_id: 'SN-001' }, department: 'Production' },
  { id: 'h2', type: 'trauma', status: 'resolved', started_at: new Date(Date.now() - 5 * 86400000).toISOString(), resolved_at: new Date(Date.now() - 5 * 86400000 + 12 * 60000).toISOString(), location_description: 'Atelier', user: { full_name: 'Youcef Benmoussa', employee_id: 'SN-002' }, department: 'Maintenance' },
  { id: 'h3', type: 'respiratory', status: 'false_alarm', started_at: new Date(Date.now() - 10 * 86400000).toISOString(), resolved_at: new Date(Date.now() - 10 * 86400000 + 4 * 60000).toISOString(), location_description: 'Stockage', user: { full_name: 'Rachid Ferhat', employee_id: 'SN-003' }, department: 'Extraction' },
  { id: 'h4', type: 'fire', status: 'resolved', started_at: new Date(Date.now() - 15 * 86400000).toISOString(), resolved_at: new Date(Date.now() - 15 * 86400000 + 30 * 60000).toISOString(), location_description: 'Tableau P3', user: { full_name: 'Kamel Bouzid', employee_id: 'SN-008' }, department: 'Sécurité' },
  { id: 'h5', type: 'neurological', status: 'resolved', started_at: new Date(Date.now() - 20 * 86400000).toISOString(), resolved_at: new Date(Date.now() - 20 * 86400000 + 18 * 60000).toISOString(), location_description: 'Bureau principal', user: { full_name: 'Mourad Belkacemi', employee_id: 'SN-005' }, department: 'Production' },
];

const MOCK_COMPANY = {
  id: 'sonatrach', name: 'Sonatrach', industry: 'Pétrole & Gaz',
  company_code: 'SNTR', contact_email: 'contact@sonatrach.dz',
  sos_hotline_phone: '+213 21 000 000', max_users: 300, current_users: 17,
  is_active: true, created_at: '2022-01-01T00:00:00Z',
  subscription_start: '2024-01-01', subscription_end: '2025-12-31',
};

// --- API base ----

const BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function apiGet<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.data as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

async function apiDelete(path: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${res.status}`);
}

// --- Overview ----

export async function caGetOverview(): Promise<CompanyAdminStats> {
  if (USE_MOCK) { await delay(300); return MOCK_STATS; }
  return apiGet('/company-admin/overview');
}

// --- Officers ----

export async function caGetOfficers(includeInactive = false): Promise<OfficerUser[]> {
  if (USE_MOCK) { await delay(300); return includeInactive ? MOCK_OFFICERS : MOCK_OFFICERS.filter(o => o.is_active); }
  return apiGet(`/company-admin/officers?include_inactive=${includeInactive}`);
}

export async function caUpdateOfficer(id: string, body: { full_name?: string; phone?: string; employee_id?: string }): Promise<OfficerUser> {
  if (USE_MOCK) { await delay(400); const o = MOCK_OFFICERS.find(o => o.id === id)!; Object.assign(o, body); return o; }
  return apiPut(`/company-admin/officers/${id}`, body);
}

export async function caDeactivateOfficer(id: string): Promise<void> {
  if (USE_MOCK) { await delay(400); const o = MOCK_OFFICERS.find(o => o.id === id); if (o) o.is_active = false; return; }
  await apiPatch(`/company-admin/officers/${id}/deactivate`);
}

export async function caReactivateOfficer(id: string): Promise<void> {
  if (USE_MOCK) { await delay(400); const o = MOCK_OFFICERS.find(o => o.id === id); if (o) o.is_active = true; return; }
  await apiPatch(`/company-admin/officers/${id}/reactivate`);
}

export async function caResetPassword(id: string): Promise<{ temp_password: string }> {
  if (USE_MOCK) { await delay(600); return { temp_password: 'TempPass#' + Math.random().toString(36).slice(2, 8).toUpperCase() }; }
  return apiPatch(`/company-admin/officers/${id}/reset-password`);
}

// --- Workers (read-only) ----

export async function caGetWorkers(department?: string, includeInactive = false): Promise<any[]> {
  if (USE_MOCK) {
    await delay(300);
    const { WORKERS } = await import('./mock-data');
    let ws = WORKERS.filter(w => w.companyId === 'sonatrach');
    if (department) ws = ws.filter(w => w.department === department);
    if (!includeInactive) ws = ws.filter(w => w.status !== 'inactive' && w.is_active !== false);
    return ws;
  }
  const qs = new URLSearchParams();
  if (department) qs.set('department', department);
  if (includeInactive) qs.set('include_inactive', 'true');
  return apiGet(`/company-admin/workers?${qs.toString()}`);
}

export async function caDeactivateWorker(id: string): Promise<void> {
  if (USE_MOCK) { await delay(400); return; }
  await apiDelete(`/users/${id}`);
}

export async function caReactivateWorker(id: string): Promise<void> {
  if (USE_MOCK) { await delay(400); return; }
  await apiPatch(`/users/${id}/reactivate`);
}

// --- Departments ----

export async function caGetDepartments(): Promise<Department[]> {
  if (USE_MOCK) { await delay(300); return [...MOCK_DEPARTMENTS]; }
  return apiGet('/company-admin/departments');
}

export async function caCreateDepartment(name: string): Promise<Department> {
  if (USE_MOCK) {
    await delay(400);
    const d: Department = { id: crypto.randomUUID(), company_id: 'sonatrach', name, is_active: true, created_at: new Date().toISOString(), units: [] };
    MOCK_DEPARTMENTS.push(d); return d;
  }
  return apiPost('/company-admin/departments', { name });
}

export async function caUpdateDepartment(id: string, body: { name?: string; is_active?: boolean }): Promise<Department> {
  if (USE_MOCK) {
    await delay(400);
    const d = MOCK_DEPARTMENTS.find(d => d.id === id)!; Object.assign(d, body); return d;
  }
  return apiPut(`/company-admin/departments/${id}`, body);
}

export async function caCreateUnit(deptId: string, name: string): Promise<import('@/types').Unit> {
  if (USE_MOCK) {
    await delay(400);
    const unit = { id: crypto.randomUUID(), department_id: deptId, name, is_active: true, created_at: new Date().toISOString() };
    const d = MOCK_DEPARTMENTS.find(d => d.id === deptId); d?.units.push(unit); return unit;
  }
  return apiPost(`/company-admin/departments/${deptId}/units`, { name });
}

export async function caUpdateUnit(deptId: string, unitId: string, body: { name?: string; is_active?: boolean }): Promise<import('@/types').Unit> {
  if (USE_MOCK) {
    await delay(400);
    const d = MOCK_DEPARTMENTS.find(d => d.id === deptId);
    const u = d?.units.find(u => u.id === unitId)!; Object.assign(u, body); return u;
  }
  return apiPut(`/company-admin/departments/${deptId}/units/${unitId}`, body);
}

// --- Notifications ----

let _mockNotifs = [...MOCK_NOTIFICATIONS];

export async function caGetNotifications(): Promise<NotificationRecipientCA[]> {
  if (USE_MOCK) { await delay(300); return _mockNotifs.filter(n => n.is_active); }
  return apiGet('/company-admin/notifications');
}

export async function caAddNotification(body: { email: string; name: string }): Promise<NotificationRecipientCA> {
  if (USE_MOCK) {
    await delay(400);
    const n: NotificationRecipientCA = { id: crypto.randomUUID(), ...body, is_active: true, created_at: new Date().toISOString(), company_id: 'sonatrach' };
    _mockNotifs.push(n); return n;
  }
  return apiPost('/company-admin/notifications', body);
}

export async function caRemoveNotification(id: string): Promise<void> {
  if (USE_MOCK) { await delay(400); _mockNotifs = _mockNotifs.filter(n => n.id !== id); return; }
  await apiDelete(`/company-admin/notifications/${id}`);
}

// --- History ----

export async function caGetHistory(filters?: { type?: string; status?: string; date_from?: string; date_to?: string; page?: number }): Promise<any[]> {
  if (USE_MOCK) {
    await delay(400);
    let h = [...MOCK_HISTORY];
    if (filters?.type) h = h.filter(e => e.type === filters.type);
    if (filters?.status) h = h.filter(e => e.status === filters.status);
    return h;
  }
  const qs = new URLSearchParams();
  if (filters?.type) qs.set('type', filters.type);
  if (filters?.status) qs.set('status', filters.status);
  if (filters?.date_from) qs.set('date_from', filters.date_from);
  if (filters?.date_to) qs.set('date_to', filters.date_to);
  if (filters?.page) qs.set('page', String(filters.page));
  return apiGet(`/company-admin/history?${qs.toString()}`);
}

// --- Settings ----

let _mockCompany = { ...MOCK_COMPANY };

export async function caGetSettings(): Promise<typeof MOCK_COMPANY> {
  if (USE_MOCK) { await delay(300); return { ..._mockCompany }; }
  return apiGet('/company-admin/settings');
}

export async function caUpdateSettings(body: { name?: string; industry?: string; contact_email?: string; sos_hotline_phone?: string }): Promise<typeof MOCK_COMPANY> {
  if (USE_MOCK) { await delay(500); _mockCompany = { ..._mockCompany, ...body }; return { ..._mockCompany }; }
  return apiPut('/company-admin/settings', body);
}