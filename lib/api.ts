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
        throw new Error(data.message || data.detail || 'Erreur serveur');
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
    const url = `${BASE_URL}/events/stream?company_id=${companyId}&token=${token}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
        try {
            const parsed = JSON.parse(event.data);
            onEvent(parsed.event || parsed.type, parsed.data);
        } catch (e) {
            console.error('SSE parse error:', e);
        }
    };

    eventSource.onerror = () => {
        console.error('SSE connection error');
        onError?.();
    };

    return eventSource;
}