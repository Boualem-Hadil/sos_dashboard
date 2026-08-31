'use client';
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { Emergency, Worker, ToastMessage, ResponderType, WorkerLocation, MedicalProfile } from '@/types';
import { getWorkers, getEmergencies, getCompanyStats } from '@/lib/data-service';
import { 
  resolveEmergencyApi, 
  addWorkerApi, 
  updateWorkerApi, 
  deleteWorkerApi, 
  updateWorkerMedicalApi 
} from '@/lib/api';

export interface AddWorkerPayload {
  fullName: string;
  employeeId: string;
  password?: string;
  phone?: string;
  unit?: string;
  department?: string;
  position?: string;
  role?: string;
}

export interface UpdateWorkerPayload {
  fullName?: string;
  employeeId?: string;
  phone?: string;
  unit?: string;
  department?: string;
  position?: string;
  role?: string;
}

export interface UpdateMedicalPayload {
  blood_type?: string;
  is_universal_donor?: boolean;
  chronic_diseases?: string[];
  allergies?: string[];
  emergency_notes?: string;
  ice_contact_name?: string;
  ice_contact_relation?: string;
  ice_contact_phone?: string;
}

interface EmergencyState {
  activeEmergencies: Emergency[];
  selectedEmergencyId: string | null;
  emergencyHistory: Emergency[];
  workers: Worker[];
  workerLocations: Record<string, WorkerLocation>;
  company: any | null;
  isLoading: boolean;
  showFlash: boolean;
  toasts: ToastMessage[];
  liveCount: number;
  authError: string | null;
  dismissedEmergencyIds: string[];
}

type Action =
  | { type: 'SET_INITIAL_DATA'; payload: { workers: Worker[]; emergencies: Emergency[]; company: any } }
  | { type: 'START_EMERGENCY'; payload: Emergency }
  | { type: 'RESOLVE_EMERGENCY' }
  | { type: 'RESOLVE_EMERGENCY_WITH_DATA'; payload: Emergency }
  | { type: 'RESOLVE_EMERGENCY_BY_ID'; payload: string }
  | { type: 'SELECT_EMERGENCY'; payload: string | null }
  | { type: 'UPDATE_EMERGENCY_FIELDS'; payload: Partial<Emergency> & { id: string } }
  | { type: 'DISMISS_FLASH' }
  | { type: 'ADD_TOAST'; payload: ToastMessage }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'UPDATE_WORKERS'; payload: Worker[] }
  | { type: 'ADD_WORKER'; payload: Worker }
  | { type: 'UPDATE_WORKER'; payload: Worker }
  | { type: 'DELETE_WORKER'; payload: string }
  | { type: 'SET_AUTH_ERROR'; payload: string }
  | { type: 'UPDATE_WORKER_LOCATION'; payload: WorkerLocation }
  | { type: 'SEED_WORKER_LOCATIONS'; payload: WorkerLocation[] }
  | { type: 'DISMISS_EMERGENCY_MODAL'; payload: string }
  | { type: 'OPEN_EMERGENCY_MODAL'; payload: string };

const initialState: EmergencyState = {
  activeEmergencies: [],
  selectedEmergencyId: null,
  emergencyHistory: [],
  workers: [],
  workerLocations: {},
  company: null,
  isLoading: true,
  showFlash: false,
  toasts: [],
  liveCount: 0,
  authError: null,
  dismissedEmergencyIds: [],
};

function reducer(state: EmergencyState, action: Action): EmergencyState {
  switch (action.type) {
    case 'SET_INITIAL_DATA':
      return {
        ...state,
        workers: action.payload.workers,
        emergencyHistory: action.payload.emergencies,
        company: action.payload.company,
        isLoading: false,
      };

    case 'UPDATE_WORKERS':
      return { ...state, workers: action.payload };

    case 'ADD_WORKER':
      if (state.workers.some(w => w.id === action.payload.id)) return state;
      return { ...state, workers: [...state.workers, action.payload] };

    case 'UPDATE_WORKER':
      return {
        ...state,
        workers: state.workers.map(w => (w.id === action.payload.id ? action.payload : w)),
      };

    case 'DELETE_WORKER':
      return {
        ...state,
        workers: state.workers.filter(w => w.id !== action.payload),
      };

    case 'START_EMERGENCY': {
      const incoming = action.payload;
      const alreadyExists = state.activeEmergencies.some(e => e.id === incoming.id);
      const updatedActive = alreadyExists
        ? state.activeEmergencies.map(e => e.id === incoming.id ? incoming : e)
        : [incoming, ...state.activeEmergencies];
      const newSelectedId = state.selectedEmergencyId ?? incoming.id;
      return {
        ...state,
        activeEmergencies: updatedActive,
        selectedEmergencyId: newSelectedId,
        showFlash: true,
        liveCount: state.liveCount + (alreadyExists ? 0 : 1),
        dismissedEmergencyIds: state.dismissedEmergencyIds.filter(id => id !== incoming.id),
        workers: state.workers.map(w =>
          w.id === incoming.workerId ? { ...w, status: 'emergency' } : w
        ),
      };
    }

    case 'RESOLVE_EMERGENCY': {
      const selectedId = state.selectedEmergencyId;
      const resolved = state.activeEmergencies.find(e => e.id === selectedId);
      const enriched = resolved
        ? { ...resolved, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
        : null;
      const remaining = state.activeEmergencies.filter(e => e.id !== selectedId);
      const nextSelectedId = remaining.length > 0 ? remaining[0].id : null;
      return {
        ...state,
        activeEmergencies: remaining,
        selectedEmergencyId: nextSelectedId,
        liveCount: Math.max(0, state.liveCount - 1),
        emergencyHistory: enriched ? [enriched, ...state.emergencyHistory] : state.emergencyHistory,
        workers: state.workers.map(w =>
          resolved && w.id === resolved.workerId ? { ...w, status: 'active' } : w
        ),
      };
    }

    case 'RESOLVE_EMERGENCY_WITH_DATA': {
      const resolved = action.payload;
      const remaining = state.activeEmergencies.filter(e => e.id !== resolved.id);
      const wasSelected = state.selectedEmergencyId === resolved.id;
      const nextSelectedId = wasSelected
        ? (remaining.length > 0 ? remaining[0].id : null)
        : state.selectedEmergencyId;
      return {
        ...state,
        activeEmergencies: remaining,
        selectedEmergencyId: nextSelectedId,
        liveCount: Math.max(0, state.liveCount - 1),
        emergencyHistory: state.emergencyHistory.some(e => e.id === resolved.id)
          ? state.emergencyHistory.map(e => e.id === resolved.id ? resolved : e)
          : [resolved, ...state.emergencyHistory],
        workers: state.workers.map(w =>
          w.id === resolved.workerId ? { ...w, status: 'active' } : w
        ),
      };
    }

    case 'RESOLVE_EMERGENCY_BY_ID': {
      const id = action.payload;
      const resolved = state.activeEmergencies.find(e => e.id === id);
      if (!resolved) return state;
      const enriched = { ...resolved, status: 'resolved' as const, resolvedAt: new Date().toISOString() };
      const remaining = state.activeEmergencies.filter(e => e.id !== id);
      const wasSelected = state.selectedEmergencyId === id;
      const nextSelectedId = wasSelected
        ? (remaining.length > 0 ? remaining[0].id : null)
        : state.selectedEmergencyId;
      return {
        ...state,
        activeEmergencies: remaining,
        selectedEmergencyId: nextSelectedId,
        liveCount: Math.max(0, state.liveCount - 1),
        emergencyHistory: state.emergencyHistory.some(e => e.id === id)
          ? state.emergencyHistory.map(e => e.id === id ? enriched : e)
          : [enriched, ...state.emergencyHistory],
        workers: state.workers.map(w =>
          w.id === resolved.workerId ? { ...w, status: 'active' } : w
        ),
      };
    }

    case 'SELECT_EMERGENCY':
      return { ...state, selectedEmergencyId: action.payload };

    case 'UPDATE_EMERGENCY_FIELDS': {
      const { id, ...fields } = action.payload;
      return {
        ...state,
        activeEmergencies: state.activeEmergencies.map(e =>
          e.id === id ? { ...e, ...fields } : e
        ),
      };
    }

    case 'DISMISS_EMERGENCY_MODAL':
      return {
        ...state,
        dismissedEmergencyIds: state.dismissedEmergencyIds.includes(action.payload)
          ? state.dismissedEmergencyIds
          : [...state.dismissedEmergencyIds, action.payload],
      };

    case 'OPEN_EMERGENCY_MODAL':
      return {
        ...state,
        dismissedEmergencyIds: state.dismissedEmergencyIds.filter(id => id !== action.payload),
      };

    case 'UPDATE_WORKER_LOCATION': {
      const loc = action.payload;
      return {
        ...state,
        workerLocations: { ...state.workerLocations, [loc.userId]: loc },
      };
    }

    case 'SEED_WORKER_LOCATIONS': {
      const seeded: Record<string, WorkerLocation> = {};
      for (const loc of action.payload) {
        seeded[loc.userId] = loc;
      }
      return { ...state, workerLocations: { ...seeded, ...state.workerLocations } };
    }

    case 'DISMISS_FLASH':
      return { ...state, showFlash: false };

    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };

    case 'SET_AUTH_ERROR':
      return { ...state, authError: action.payload, isLoading: false };

    default:
      return state;
  }
}

export interface EmergencyContextValue extends EmergencyState {
  status: 'idle' | 'active' | 'resolved';
  currentEmergency: Emergency | null;
  startEmergency: (e: Emergency) => void;
  resolveEmergency: () => void;
  resolveEmergencyById: (id: string) => void;
  resolveEmergencyWithData: (
    idOrEmergency: string | Emergency,
    status?: 'resolved' | 'false_alarm',
    responderType?: ResponderType,
    etaMinutes?: number,
    notes?: string
  ) => Promise<void>;
  dispatchResolvedEmergency: (emergency: Emergency) => void;
  dismissEmergencyModal: (id: string) => void;
  openEmergencyModal: (emergencyOrId: Emergency | string) => void;
  selectEmergency: (id: string | null) => void;
  updateEmergencyFields: (id: string, fields: Partial<Emergency>) => void;
  dismissFlash: () => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  addWorker: (payload: AddWorkerPayload) => Promise<Worker | void>;
  updateWorker: (id: string, payload: UpdateWorkerPayload) => Promise<Worker | void>;
  deleteWorker: (id: string) => Promise<void>;
  updateMedicalProfile: (id: string, payload: UpdateMedicalPayload) => Promise<void>;
  updateWorkerLocation: (loc: WorkerLocation) => void;
  seedWorkerLocations: (locs: WorkerLocation[]) => void;
}

const EmergencyContext = createContext<EmergencyContextValue | null>(null);

import { getAuth, getToken } from '@/lib/auth';

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const currentEmergency = state.activeEmergencies.find(
    e => e.id === state.selectedEmergencyId
  ) ?? null;

  const status: 'idle' | 'active' | 'resolved' =
    state.activeEmergencies.length > 0 ? 'active' : 'idle';

  React.useEffect(() => {
    async function loadData() {
      try {
        const auth = getAuth();
        const token = getToken();

        if (!auth || !token) {
          dispatch({ type: 'SET_AUTH_ERROR', payload: 'Not authenticated' });
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return;
        }

        if (auth?.role === 'super_admin') {
          dispatch({
            type: 'SET_INITIAL_DATA',
            payload: { workers: [], emergencies: [], company: { name: 'SOS Algérie Platform' } },
          });
          return;
        }

        const companyId = auth?.companyId || 'COMP-123';

        const [fetchedWorkers, fetchedEmergencies, fetchedCompanies] = await Promise.all([
          getWorkers(),
          getEmergencies({ limit: 500 }),
          getCompanyStats(companyId).catch(() => null)
        ]);

        const companyData = Array.isArray(fetchedCompanies)
          ? fetchedCompanies[0]
          : (fetchedCompanies ?? { name: auth.companyName || 'Mon Entreprise', id: companyId });

        dispatch({
          type: 'SET_INITIAL_DATA',
          payload: {
            workers: fetchedWorkers || [],
            emergencies: fetchedEmergencies || [],
            company: companyData,
          }
        });

        const seeds = (fetchedWorkers || [])
          .filter((w: any) => 
            (w.last_lat != null && w.last_lng != null) || 
            (w.lastLat != null && w.lastLng != null) || 
            (w.latitude != null && w.longitude != null) ||
            (w.lat != null && w.lng != null)
          )
          .map((w: any): WorkerLocation => ({
            userId: w.id,
            lat: Number(w.last_lat ?? w.lastLat ?? w.latitude ?? w.lat),
            lng: Number(w.last_lng ?? w.lastLng ?? w.longitude ?? w.lng),
            status: w.status === 'emergency' ? 'emergency' : 'active',
            fullName: `${w.firstName || ''} ${w.lastName || ''}`.trim() || w.full_name || 'Travailleur',
            employeeId: w.employeeId || w.employee_id || '',
            updatedAt: w.lastSeen || w.last_seen || new Date().toISOString(),
          }));
        if (seeds.length > 0) {
          dispatch({ type: 'SEED_WORKER_LOCATIONS', payload: seeds });
        }
      } catch (err: any) {
        console.error('Failed to load initial data', err);
        const msg = err.message || '';
        const isAuthError =
          msg === 'Not authenticated' ||
          msg === 'Invalid or expired token' ||
          msg === 'User not found or deactivated' ||
          msg.toLowerCase().includes('unauthorized') ||
          err.status === 401;
        const isPermissionError =
          msg.includes('permissions') ||
          msg.includes('Access denied') ||
          msg.includes('Forbidden') ||
          err.status === 403;

        if (isPermissionError) {
          dispatch({ type: 'SET_AUTH_ERROR', payload: 'Permission denied' });
        } else if (isAuthError) {
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          } else {
            dispatch({ type: 'SET_AUTH_ERROR', payload: 'Not authenticated' });
          }
        } else {
          dispatch({ type: 'SET_AUTH_ERROR', payload: msg || 'Failed to load data' });
        }
      }
    }
    loadData();
  }, []);

  const startEmergency = useCallback((e: Emergency) => {
    dispatch({ type: 'START_EMERGENCY', payload: e });
    setTimeout(() => dispatch({ type: 'DISMISS_FLASH' }), 2000);
  }, []);

  const resolveEmergency = useCallback(() => {
    dispatch({ type: 'RESOLVE_EMERGENCY' });
  }, []);

  const resolveEmergencyById = useCallback((id: string) => {
    dispatch({ type: 'RESOLVE_EMERGENCY_BY_ID', payload: id });
  }, []);

  const dismissEmergencyModal = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_EMERGENCY_MODAL', payload: id });
  }, []);

  const openEmergencyModal = useCallback((emergencyOrId: Emergency | string) => {
    if (typeof emergencyOrId === 'string') {
      dispatch({ type: 'OPEN_EMERGENCY_MODAL', payload: emergencyOrId });
      const found = state.emergencyHistory.find(e => e.id === emergencyOrId);
      if (found && found.status === 'active') {
        dispatch({ type: 'START_EMERGENCY', payload: found });
      }
    } else {
      dispatch({ type: 'OPEN_EMERGENCY_MODAL', payload: emergencyOrId.id });
      dispatch({ type: 'START_EMERGENCY', payload: emergencyOrId });
    }
  }, [state.emergencyHistory]);

  const dispatchResolvedEmergency = useCallback((emergency: Emergency) => {
    dispatch({ type: 'RESOLVE_EMERGENCY_WITH_DATA', payload: emergency });
  }, []);

  const resolveEmergencyWithData = useCallback(async (
    idOrEmergency: string | Emergency,
    statusArg: 'resolved' | 'false_alarm' = 'resolved',
    responderType?: ResponderType,
    etaMinutes?: number,
    notes?: string,
  ) => {
    if (typeof idOrEmergency === 'object') {
      dispatch({ type: 'RESOLVE_EMERGENCY_WITH_DATA', payload: idOrEmergency });
      return;
    }
    const token = getToken();
    if (!token) return;
    try {
      const res = await resolveEmergencyApi(idOrEmergency, statusArg, token, responderType, etaMinutes, notes);
      const apiEmergency = res?.data;
      if (apiEmergency) {
        const enriched: Emergency = {
          ...(currentEmergency ?? ({} as Emergency)),
          id: apiEmergency.id,
          status: apiEmergency.status,
          resolvedAt: apiEmergency.resolved_at,
          notes: apiEmergency.notes,
          responderType: apiEmergency.responder_type,
          etaMinutes: apiEmergency.eta_minutes,
        };
        dispatch({ type: 'RESOLVE_EMERGENCY_WITH_DATA', payload: enriched });
      } else {
        dispatch({ type: 'RESOLVE_EMERGENCY' });
      }
    } catch (err) {
      console.error('Failed to resolve emergency:', err);
      throw err;
    }
  }, [currentEmergency]);

  const selectEmergency = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_EMERGENCY', payload: id });
  }, []);

  const updateEmergencyFields = useCallback((id: string, fields: Partial<Emergency>) => {
    dispatch({ type: 'UPDATE_EMERGENCY_FIELDS', payload: { id, ...fields } });
  }, []);

  const dismissFlash = useCallback(() => {
    dispatch({ type: 'DISMISS_FLASH' });
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    dispatch({ type: 'ADD_TOAST', payload: { ...toast, id } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, []);

  const addWorker = useCallback(async (payload: AddWorkerPayload) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await addWorkerApi({
      full_name: payload.fullName,
      employee_id: payload.employeeId,
      password: payload.password,
      phone: payload.phone,
      unit: payload.unit,
      department: payload.department,
      position: payload.position,
      role: payload.role,
    }, token);

    if (res.data) {
      const w = res.data;
      const parts = (w.full_name || '').split(' ');
      const newWorker: Worker = {
        ...w,
        id: w.id,
        firstName: parts[0] || 'Inconnu',
        lastName: parts.slice(1).join(' ') || 'Inconnu',
        employeeId: w.employee_id,
        status: w.is_active ? 'active' : 'offline',
        phone: w.phone || 'N/A',
        unit: w.unit || 'Non assigné',
        department: w.department || 'Non assigné',
        position: w.position || 'Non assigné',
        bloodType: (w.blood_type || 'O+') as MedicalProfile['bloodType'],
        lastSeen: w.last_seen || new Date().toISOString(),
        joinDate: w.created_at || new Date().toISOString(),
        medicalProfile: {
          bloodType: 'O+',
          allergies: [],
          chronicDiseases: [],
          medications: [],
          emergencyNotes: '',
          iceContact: { name: 'N/A', relation: 'N/A', phone: 'N/A' },
          lastCheckup: new Date().toISOString()
        }
      };
      dispatch({ type: 'ADD_WORKER', payload: newWorker });
      return newWorker;
    }
  }, []);

  const updateWorker = useCallback(async (id: string, payload: UpdateWorkerPayload) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await updateWorkerApi(id, {
      full_name: payload.fullName,
      employee_id: payload.employeeId,
      phone: payload.phone,
      unit: payload.unit,
      department: payload.department,
      position: payload.position,
      role: payload.role,
    }, token);

    if (res.data) {
      const w = res.data;
      const parts = (w.full_name || '').split(' ');
      const existing = state.workers.find(wk => wk.id === id);
      const updated: Worker = {
        ...(existing || ({} as Worker)),
        id: w.id,
        firstName: parts[0] || 'Inconnu',
        lastName: parts.slice(1).join(' ') || 'Inconnu',
        employeeId: w.employee_id,
        status: w.is_active ? 'active' : 'offline',
        phone: w.phone || 'N/A',
        unit: w.unit || 'Non assigné',
        department: w.department || 'Non assigné',
        position: w.position || 'Non assigné',
        bloodType: (existing?.bloodType || 'O+') as MedicalProfile['bloodType'],
        lastSeen: w.last_seen || new Date().toISOString(),
        joinDate: w.created_at || new Date().toISOString(),
        medicalProfile: existing?.medicalProfile || {
          bloodType: 'O+', allergies: [], chronicDiseases: [], medications: [], emergencyNotes: '', iceContact: { name: 'N/A', relation: 'N/A', phone: 'N/A' }, lastCheckup: new Date().toISOString()
        },
        companyId: w.company_id,
      };
      dispatch({ type: 'UPDATE_WORKER', payload: updated });
      return updated;
    }
  }, [state.workers]);

  const deleteWorker = useCallback(async (id: string) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    await deleteWorkerApi(id, token);
    dispatch({ type: 'DELETE_WORKER', payload: id });
  }, []);

  const updateMedicalProfile = useCallback(async (id: string, payload: UpdateMedicalPayload) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await updateWorkerMedicalApi(id, {
      blood_type: payload.blood_type || 'O+',
      is_universal_donor: payload.is_universal_donor || false,
      chronic_diseases: payload.chronic_diseases || [],
      allergies: payload.allergies || [],
      emergency_notes: payload.emergency_notes || '',
      ice_contact_name: payload.ice_contact_name || '',
      ice_contact_relation: payload.ice_contact_relation || '',
      ice_contact_phone: payload.ice_contact_phone || '',
    }, token);

    if (res.data) {
      const existing = state.workers.find(w => w.id === id);
      if (existing) {
        dispatch({
          type: 'UPDATE_WORKER',
          payload: {
            ...existing,
            bloodType: (payload.blood_type || existing.bloodType) as any,
            medicalProfile: {
              ...existing.medicalProfile,
              bloodType: (payload.blood_type || existing.bloodType) as any,
              chronicDiseases: payload.chronic_diseases || [],
              allergies: payload.allergies || [],
              emergencyNotes: payload.emergency_notes || '',
              iceContact: {
                name: payload.ice_contact_name || '',
                relation: payload.ice_contact_relation || '',
                phone: payload.ice_contact_phone || '',
              }
            }
          }
        });
      }
    }
  }, [state.workers]);

  const updateWorkerLocation = useCallback((loc: WorkerLocation) => {
    dispatch({ type: 'UPDATE_WORKER_LOCATION', payload: loc });
  }, []);

  const seedWorkerLocations = useCallback((locs: WorkerLocation[]) => {
    dispatch({ type: 'SEED_WORKER_LOCATIONS', payload: locs });
  }, []);

  return (
    <EmergencyContext.Provider value={{
      ...state,
      status,
      currentEmergency,
      startEmergency,
      resolveEmergency,
      resolveEmergencyById,
      resolveEmergencyWithData,
      dispatchResolvedEmergency,
      dismissEmergencyModal,
      openEmergencyModal,
      selectEmergency,
      updateEmergencyFields,
      dismissFlash,
      addToast,
      removeToast,
      addWorker,
      updateWorker,
      deleteWorker,
      updateMedicalProfile,
      updateWorkerLocation,
      seedWorkerLocations,
    }}>
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error('useEmergency must be used within EmergencyProvider');
  return ctx;
}
