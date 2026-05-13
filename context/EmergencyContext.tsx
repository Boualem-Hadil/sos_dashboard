'use client';
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { Emergency, Worker, ToastMessage } from '@/types';
import { WORKERS, EMERGENCY_HISTORY, COMPANIES } from '@/lib/mock-data';

interface EmergencyState {
  status: 'idle' | 'active' | 'resolved';
  currentEmergency: Emergency | null;
  emergencyHistory: Emergency[];
  workers: Worker[];
  showFlash: boolean;
  toasts: ToastMessage[];
  liveCount: number;
}

type Action =
  | { type: 'START_EMERGENCY'; payload: Emergency }
  | { type: 'RESOLVE_EMERGENCY' }
  | { type: 'DISMISS_FLASH' }
  | { type: 'ADD_TOAST'; payload: ToastMessage }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'UPDATE_WORKERS'; payload: Worker[] };

const initialState: EmergencyState = {
  status: 'idle',
  currentEmergency: null,
  emergencyHistory: EMERGENCY_HISTORY,
  workers: WORKERS,
  showFlash: false,
  toasts: [],
  liveCount: 0,
};

function reducer(state: EmergencyState, action: Action): EmergencyState {
  switch (action.type) {
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
  company: typeof COMPANIES[0] | undefined;
}

const EmergencyContext = createContext<EmergencyContextValue | null>(null);

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

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

  const company = COMPANIES[0];

  return (
    <EmergencyContext.Provider value={{ ...state, startEmergency, resolveEmergency, dismissFlash, addToast, removeToast, company }}>
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error('useEmergency must be used within EmergencyProvider');
  return ctx;
}
