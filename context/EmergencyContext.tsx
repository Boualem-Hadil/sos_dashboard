'use client';
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { Emergency, Worker, ToastMessage } from '@/types';
import { getWorkers, getEmergencies, getCompanyStats } from '@/lib/data-service';

interface EmergencyState {
  status: 'idle' | 'active' | 'resolved';
  currentEmergency: Emergency | null;
  emergencyHistory: Emergency[];
  workers: Worker[];
  company: any | null; // using any for company to match the mock format for now
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
  | { type: 'DISMISS_FLASH' }
  | { type: 'ADD_TOAST'; payload: ToastMessage }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'UPDATE_WORKERS'; payload: Worker[] }
  | { type: 'ADD_WORKER'; payload: Worker }
  | { type: 'SET_AUTH_ERROR'; payload: string };

const initialState: EmergencyState = {
  status: 'idle',
  currentEmergency: null,
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
      // avoid duplicates
      if (state.workers.some(w => w.id === action.payload.id)) return state;
      return { ...state, workers: [...state.workers, action.payload] };
    case 'START_EMERGENCY':
      return {
        ...state,
        status: 'active',
        currentEmergency: action.payload,
        showFlash: true,
        liveCount: state.liveCount + 1,
        workers: state.workers.map(w =>
          w.id === action.payload.workerId ? { ...w, status: 'emergency' } : w
        ),
      };
    case 'RESOLVE_EMERGENCY': {
      const resolved = state.currentEmergency
        ? { ...state.currentEmergency, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
        : null;
      return {
        ...state,
        status: 'resolved',
        currentEmergency: null,
        liveCount: Math.max(0, state.liveCount - 1),
        emergencyHistory: resolved
          ? [resolved, ...state.emergencyHistory]
          : state.emergencyHistory,
        workers: state.workers.map(w =>
          resolved && w.id === resolved.workerId ? { ...w, status: 'active' } : w
        ),
      };
    }
    case 'DISMISS_FLASH':
      return { ...state, showFlash: false };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'UPDATE_WORKERS':
      return { ...state, workers: action.payload };
    case 'SET_AUTH_ERROR':
      return { ...state, authError: action.payload, isLoading: false };
    default:
      return state;
  }
}

interface EmergencyContextValue extends EmergencyState {
  startEmergency: (e: Emergency) => void;
  resolveEmergency: () => void;
  dismissFlash: () => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  addWorker: (worker: Worker) => void;
}

const EmergencyContext = createContext<EmergencyContextValue | null>(null);

import { getAuth, getToken } from '@/lib/auth';

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  React.useEffect(() => {
    async function loadData() {
      try {
        const auth = getAuth();
        const token = getToken();

        // If not logged in, don't attempt to fetch (prevents console error overlay on /login)
        if (!auth || !token) {
          dispatch({ type: 'SET_AUTH_ERROR', payload: 'Not authenticated' });
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return;
        }

        // Super admins manage the whole platform from /admin — skip company-specific data
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

        // Handle array response from mock-data COMPANIES
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
        // Determine if it's a genuine auth failure (401/403) vs a generic API error
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

  return (
    <EmergencyContext.Provider value={{ ...state, startEmergency, resolveEmergency, dismissFlash, addToast, removeToast, addWorker }}>
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error('useEmergency must be used within EmergencyProvider');
  return ctx;
}
