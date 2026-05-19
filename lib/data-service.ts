import { getToken } from './auth';
import {
    getWorkersApi,
    getEmergenciesApi,
    getCompanyApi,
    resolveEmergencyApi,
} from './api';
import {
    WORKERS,
    EMERGENCY_HISTORY,
    COMPANIES,
    MOCK_ACTIVE_EMERGENCY,
} from './mock-data';

// Read the flag once
const USE_MOCK = false; // process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// ── Workers ───────────────────────────────────────────────────────────────────
export async function getWorkers() {
    if (USE_MOCK) {
        // Simulate network delay so UI behavior is realistic
        await delay(300);
        return WORKERS;
    }
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const response = await getWorkersApi(token);
    
    let workers = [];
    if (Array.isArray(response)) workers = response;
    else if (response?.data && Array.isArray(response.data)) workers = response.data;
    else if (response?.items && Array.isArray(response.items)) workers = response.items;
    
    return workers.map((w: any) => {
        const parts = (w.full_name || '').split(' ');
        const firstName = w.firstName || parts[0] || 'Inconnu';
        const lastName = w.lastName || parts.slice(1).join(' ') || 'Inconnu';
        
        const mp = w.medical_profile || w.medicalProfile || {};
        const defaultMp = { bloodType: 'O+', allergies: [], chronicDiseases: [], medications: [], emergencyNotes: '', iceContact: { name: 'N/A', relation: 'N/A', phone: 'N/A' }, lastCheckup: new Date().toISOString() };
        
        return {
            ...w,
            id: w.id || w._id || Math.random().toString(),
            firstName,
            lastName,
            employeeId: w.employee_id || w.employeeId || 'N/A',
            status: w.status || (w.is_active ? 'active' : 'offline'),
            unit: w.unit || 'Non assigné',
            department: w.department || 'Non assigné',
            position: w.position || 'Non assigné',
            phone: w.phone || 'N/A',
            lastSeen: w.last_seen || w.lastSeen || new Date().toISOString(),
            joinDate: w.created_at || w.joinDate || new Date().toISOString(),
            bloodType: w.bloodType || mp.blood_type || mp.bloodType || 'N/A',
            medicalProfile: {
                ...defaultMp,
                ...mp,
                bloodType: mp.blood_type || mp.bloodType || 'N/A',
                chronicDiseases: mp.chronic_diseases || mp.chronicDiseases || [],
                emergencyNotes: mp.emergency_notes || mp.emergencyNotes || '',
                iceContact: {
                    name: mp.ice_contact_name || mp.iceContact?.name || 'N/A',
                    relation: mp.ice_contact_relation || mp.iceContact?.relation || 'N/A',
                    phone: mp.ice_contact_phone || mp.iceContact?.phone || 'N/A',
                }
            }
        };
    });
}

// ── Emergencies ───────────────────────────────────────────────────────────────
export async function getEmergencies(filters?: {
    type?: string;
    status?: string;
    page?: number;
}) {
    if (USE_MOCK) {
        await delay(300);
        let result = [...EMERGENCY_HISTORY];
        // Apply filters to mock data too so behavior is consistent
        if (filters?.type) {
            result = result.filter(e => e.type === filters.type);
        }
        if (filters?.status) {
            result = result.filter(e => e.status === filters.status);
        }
        return result;
    }
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const response = await getEmergenciesApi(token, filters);
    
    // Safely extract items depending on whether the API wraps the response in data or returns it directly
    let items = [];
    if (Array.isArray(response)) items = response;
    else if (response?.data && Array.isArray(response.data)) items = response.data;
    else if (response?.data?.items && Array.isArray(response.data.items)) items = response.data.items;
    else if (response?.items && Array.isArray(response.items)) items = response.items;
    
    return items;
}

// ── Active emergency (live) ───────────────────────────────────────────────────
export async function getActiveEmergency() {
    if (USE_MOCK) {
        await delay(200);
        return MOCK_ACTIVE_EMERGENCY; // null or an emergency object
    }
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    // Active emergencies come via SSE in real mode
    // This is just for initial page load
    const response = await getEmergenciesApi(token, { status: 'active', limit: 1 });
    return response.data.items[0] || null;
}

// ── Company stats ─────────────────────────────────────────────────────────────
export async function getCompanyStats(companyId: string) {
    if (USE_MOCK) {
        await delay(200);
        return COMPANIES;
    }
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const response = await getCompanyApi(companyId, token);
    return response.data;
}

// ── Resolve emergency ─────────────────────────────────────────────────────────
export async function resolveEmergency(
    id: string,
    status: 'resolved' | 'false_alarm'
) {
    if (USE_MOCK) {
        await delay(500);
        // In mock mode just return success — UI handles the state update
        return { success: true };
    }
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const response = await resolveEmergencyApi(id, status, token);
    return response.data;
}

// ── Helper ────────────────────────────────────────────────────────────────────
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}