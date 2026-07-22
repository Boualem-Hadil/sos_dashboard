const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Generic fetch helper ──────────────────────────────────────────────────────
async function apiFetch(
    endpoint: string,
    options: RequestInit = {},
    token?: string
) {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        const error: any = new Error(data.message || data.detail || 'Erreur serveur');
        error.status = response.status;
        throw error;
    }

    return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function loginApi(
    employeeId: string,
    password: string,
    companyCode: string
) {
    return apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            employee_id: employeeId,
            password,
            company_code: companyCode.toUpperCase(),
        }),
    });
}

export async function registerApi(
    fullName: string,
    employeeId: string,
    password: string,
    phone: string,
    companyCode: string
) {
    return apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            full_name: fullName,
            employee_id: employeeId,
            password,
            phone,
            company_code: companyCode.toUpperCase(),
        }),
    });
}

export async function getMeApi(token: string) {
    return apiFetch('/auth/me', {}, token);
}

// ── Workers ───────────────────────────────────────────────────────────────────
export async function getWorkersApi(token: string) {
    return apiFetch('/users', {}, token);
}

export async function getWorkerApi(id: string, token: string) {
    return apiFetch(`/users/${id}`, {}, token);
}

export async function syncMedicalProfileApi(
    profile: {
        blood_type: string;
        is_universal_donor: boolean;
        chronic_diseases: string[];
        allergies: string[];
        emergency_notes: string;
        ice_contact_name: string;
        ice_contact_relation: string;
        ice_contact_phone: string;
    },
    token: string
) {
    return apiFetch('/users/medical-profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
    }, token);
}

// ── Emergencies ───────────────────────────────────────────────────────────────
export async function getEmergenciesApi(
    token: string,
    params?: {
        page?: number;
        limit?: number;
        type?: string;
        status?: string;
    }
) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);

    return apiFetch(`/emergencies?${query.toString()}`, {}, token);
}

export async function getEmergencyApi(id: string, token: string) {
    return apiFetch(`/emergencies/${id}`, {}, token);
}

export async function reportEmergencyApi(
    data: {
        type: string;
        severity: string;
        latitude?: number;
        longitude?: number;
        location_description?: string;
    },
    token: string
) {
    return apiFetch('/emergencies', {
        method: 'POST',
        body: JSON.stringify(data),
    }, token);
}

export async function resolveEmergencyApi(
    id: string,
    status: 'resolved' | 'false_alarm',
    token: string
) {
    return apiFetch(`/emergencies/${id}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
    }, token);
}

// ── Company ───────────────────────────────────────────────────────────────────
export async function getCompanyApi(id: string, token: string) {
    return apiFetch(`/companies/${id}`, {}, token);
}

// ── SSE ───────────────────────────────────────────────────────────────────────
export function createSSEConnection(
    companyId: string,
    token: string,
    onEvent: (type: string, data: unknown) => void,
    onError?: () => void
): EventSource {
    const url = `${BASE_URL}/events/stream?company_id=${companyId}&token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
        try {
            const parsed = JSON.parse(event.data);
            onEvent(parsed.event || parsed.type, parsed.data);
        } catch (e) {
            console.error('SSE parse error:', e);
        }
    };

    eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        onError?.();
    };

    return eventSource;
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export async function getAdminStatsApi(token: string) {
    return apiFetch('/admin/stats', {}, token);
}

export async function getAdminCompaniesApi(token: string) {
    return apiFetch('/admin/companies', {}, token);
}

export async function createAdminCompanyApi(data: {
    name: string;
    industry: string;
    company_code: string;
    max_users: number;
    contact_email?: string;
    subscription_start?: string;
    subscription_end?: string;
}, token: string) {
    return apiFetch('/admin/companies', { method: 'POST', body: JSON.stringify(data) }, token);
}

export async function updateAdminCompanyApi(id: string, data: {
    name?: string;
    industry?: string;
    max_users?: number;
    contact_email?: string;
    subscription_start?: string;
    subscription_end?: string;
    is_active?: boolean;
}, token: string) {
    return apiFetch(`/admin/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token);
}

export async function getExpiringCompaniesApi(token: string, days = 30) {
    return apiFetch(`/admin/companies/expiring?days=${days}`, {}, token);
}

export async function getAdminOfficersApi(token: string) {
    return apiFetch('/admin/officers', {}, token);
}

export async function createAdminOfficerApi(data: {
    full_name: string;
    employee_id: string;
    password: string;
    phone?: string;
    company_id: string;
}, token: string) {
    return apiFetch('/admin/officers', { method: 'POST', body: JSON.stringify(data) }, token);
}

export async function deactivateAdminOfficerApi(userId: string, token: string) {
    return apiFetch(`/admin/officers/${userId}`, { method: 'DELETE' }, token);
}

export async function getNotificationRecipientsApi(token: string) {
    return apiFetch('/admin/notification-recipients', {}, token);
}

export async function addNotificationRecipientApi(data: { email: string; name: string }, token: string) {
    return apiFetch('/admin/notification-recipients', { method: 'POST', body: JSON.stringify(data) }, token);
}

export async function removeNotificationRecipientApi(id: string, token: string) {
    return apiFetch(`/admin/notification-recipients/${id}`, { method: 'DELETE' }, token);
}
