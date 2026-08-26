'use client';
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { Emergency, Worker, ToastMessage, ResponderType } from '@/types';
import { getWorkers, getEmergencies, getCompanyStats } from '@/lib/data-service';
import { resolveEmergencyApi } from '@/lib/api';

interface EmergencyState {
  // ── Multi-emergency state (replaces single currentEmergency) ──────────────
  activeEmergencies: Emergency[];       // all currently active, newest-first
  selectedEmergencyId: string | null;  // which one is shown in the modal
  // ── Shared state ──────────────────────────────────────────────────────────
  emergencyHistory: Emergency[];
  workers: Worker[];
  company: any | null;
  isLoading: boolean;
  showFlash: boolean;
  toasts: ToastMessage[];
  liveCount: number;
  authError: string | null;
}

type Action =
  | { type: 'SET_INITIAL_DATA'; payload: { workers: Worker[]; emergencies: Emergency[]; company: any } }
  | { type: 'START_EMERGENCY'; payload: Emergency }
  | { type: 'RESOLVE_EMERGENCY' }
  | { type: 'RESOLVE_EMERGENCY_WITH_DATA'; payload: Emergency }
  | { type: 'RESOLVE_EMERGENCY_BY_ID'; payload: string }  // resolve a specific id without needing full Emergency object
  | { type: 'SELECT_EMERGENCY'; payload: string | null }
  | { type: 'DISMISS_FLASH' }
  | { type: 'ADD_TOAST'; payload: ToastMessage }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'UPDATE_WORKERS'; payload: Worker[] }
  | { type: 'ADD_WORKER'; payload: Worker }
  | { type: 'SET_AUTH_ERROR'; payload: string }
  | { type: 'UPDATE_EMERGENCY_FIELDS'; payload: Partial<Emergency> & { id: string } };

const initialState: EmergencyState = {
  activeEmergencies: [],
  selectedEmergencyId: null,
  emergencyHistory: [],
  workers: [],
  company: null,
  isLoading: true,
  showFlash: false,
  toasts: [],
  liveCount: 0,
  authError: null,
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

    case 'START_EMERGENCY': {
      const incoming = action.payload;
      const alreadyExists = state.activeEmergencies.some(e => e.id === incoming.id);
      const updatedActive = alreadyExists
        ? state.activeEmergencies.map(e => e.id === incoming.id ? incoming : e)
        : [incoming, ...state.activeEmergencies];
      // Auto-select if nothing is currently selected
      const newSelectedId = state.selectedEmergencyId ?? incoming.id;
      return {
        ...state,
        activeEmergencies: updatedActive,
        selectedEmergencyId: newSelectedId,
        showFlash: true,
        liveCount: state.liveCount + (alreadyExists ? 0 : 1),
        workers: state.workers.map(w =>
          w.id === incoming.workerId ? { ...w, status: 'emergency' } : w
        ),
      };
    }

    case 'RESOLVE_EMERGENCY': {
      // Resolves the currently selected emergency
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
      // Resolves whichever emergency matches payload.id
      const resolved = action.payload;
      const existing = state.activeEmergencies.find(e => e.id === resolved.id);
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
          existing && w.id === existing.workerId ? { ...w, status: 'active' } : w
        ),
      };
    }

    case 'SELECT_EMERGENCY':
      return { ...state, selectedEmergencyId: action.payload };

    case 'RESOLVE_EMERGENCY_BY_ID': {
      // Removes a specific emergency by id without needing a full Emergency object.
      // Used by the SSE EMERGENCY_RESOLVED handler to avoid the race condition
      // where resolving via the modal button already removed the selected emergency
      // and the SSE echo would then erroneously remove the newly-selected one.
      const targetId = action.payload;
      const targetEmergency = state.activeEmergencies.find(e => e.id === targetId);
      // If the id is no longer in the array (already removed by the modal button), do nothing.
      if (!targetEmergency) return state;
      const remaining = state.activeEmergencies.filter(e => e.id !== targetId);
      const wasSelected = state.selectedEmergencyId === targetId;
      const nextSelectedId = wasSelected
        ? (remaining.length > 0 ? remaining[0].id : null)
        : state.selectedEmergencyId;
      const enriched = { ...targetEmergency, status: 'resolved' as const, resolvedAt: new Date().toISOString() };
      return {
        ...state,
        activeEmergencies: remaining,
        selectedEmergencyId: nextSelectedId,
        liveCount: Math.max(0, state.liveCount - 1),
        emergencyHistory: [enriched, ...state.emergencyHistory.filter(e => e.id !== targetId)],
        workers: state.workers.map(w =>
          w.id === targetEmergency.workerId ? { ...w, status: 'active' } : w
        ),
      };
    }

    case 'DISMISS_FLASH':
      return { ...state, showFlash: false };

    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };

    case 'SET_AUTH_ERROR':
      return { ...state, authError: action.payload, isLoading: false };

    case 'UPDATE_EMERGENCY_FIELDS': {
      const { id, ...fields } = action.payload;
      return {
        ...state,
        activeEmergencies: state.activeEmergencies.map(e =>
          e.id === id ? { ...e, ...fields } : e
        ),
      };
    }

    default:
      return state;
  }
}

interface EmergencyContextValue extends EmergencyState {
  // Derived / computed for backward compat
  status: 'idle' | 'active' | 'resolved';
  currentEmergency: Emergency | null;
  // Actions
  startEmergency: (e: Emergency) => void;
  resolveEmergency: () => void;
  resolveEmergencyById: (id: string) => void;  // SSE-safe: removes by id, no-ops if already gone
  resolveEmergencyWithData: (
    id: string,
    status: 'resolved' | 'false_alarm',
    responderType?: ResponderType,
    etaMinutes?: number,
    notes?: string,
  ) => Promise<void>;
  selectEmergency: (id: string | null) => void;
  updateEmergencyFields: (id: string, fields: Partial<Emergency>) => void;
  dismissFlash: () => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  addWorker: (worker: Worker) => void;
}

const EmergencyContext = createContext<EmergencyContextValue | null>(null);

import { getAuth, getToken } from '@/lib/auth';

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Derived values kept for backward compat with all existing consumers
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
          getEmergencies(),
          getCompanyStats(companyId).catch(() => null)
        ]);

        const companyData = Array.isArray(fetchedCompanies) ? fetchedCompanies[0] : fetchedCompanies;

        dispatch({
          type: 'SET_INITIAL_DATA',
          payload: {
            workers: fetchedWorkers || [],
            emergencies: fetchedEmergencies || [],
            company: companyData,
          }
        });
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

  const resolveEmergencyWithData = useCallback(async (
    id: string,
    statusArg: 'resolved' | 'false_alarm',
    responderType?: ResponderType,
    etaMinutes?: number,
    notes?: string,
  ) => {
    const { getToken } = await import('@/lib/auth');
    const token = getToken();
    if (!token) return;
    try {
      const res = await resolveEmergencyApi(id, statusArg, token, responderType, etaMinutes, notes);
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

  const addWorker = useCallback((worker: Worker) => {
    dispatch({ type: 'ADD_WORKER', payload: worker });
  }, []);

  const updateEmergencyFields = useCallback((id: string, fields: Partial<Emergency>) => {
    dispatch({ type: 'UPDATE_EMERGENCY_FIELDS', payload: { id, ...fields } });
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
      selectEmergency,
      updateEmergencyFields,
      dismissFlash,
      addToast,
      removeToast,
      addWorker,
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

