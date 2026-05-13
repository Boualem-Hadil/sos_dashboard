'use client';
import { useEffect, useRef } from 'react';
import { useEmergency } from '@/context/EmergencyContext';
import { MOCK_ACTIVE_EMERGENCY } from '@/lib/mock-data';
import { useAlarm } from './useAlarm';

export function useSSE() {
  const { startEmergency, resolveEmergency, addToast } = useEmergency();
  const { playAlarm, stopAlarm } = useAlarm();
  const simulatedRef = useRef(false);

  useEffect(() => {
    if (simulatedRef.current) return;
    simulatedRef.current = true;

    // Simulate emergency after 10 seconds
    const timer = setTimeout(() => {
      const emergency = { ...MOCK_ACTIVE_EMERGENCY, startedAt: new Date().toISOString() };
      startEmergency(emergency);
      playAlarm();

      // Browser notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission().then(p => {
          if (p === 'granted') {
            new Notification('🚨 URGENCE ACTIVE — SOS Algérie', {
              body: `${emergency.workerName} • ${emergency.unit}\nUrgence cardiaque critique`,
              icon: '/favicon.ico',
            });
          }
        });
      }

      addToast({ type: 'error', title: '🚨 Urgence déclenchée', message: `${emergency.workerName} — Cardiaque critique` });
    }, 10000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolve = () => {
    resolveEmergency();
    stopAlarm();
    addToast({ type: 'success', title: '✅ Urgence résolue', message: 'Le panneau d\'urgence a été fermé.' });
  };

  return { handleResolve };
}
