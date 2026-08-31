'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { EmergencyModal } from '../dashboard/EmergencyModal';
import { useEmergency } from '@/context/EmergencyContext';
import { useSSE } from '@/hooks/useSSE';
import { getAuth, getToken } from '@/lib/auth';

function ToastContainer() {
  const { toasts, removeToast } = useEmergency();
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl cursor-pointer min-w-64 max-w-80"
            style={{
              background: t.type === 'success' ? 'rgba(76,175,80,0.15)' : t.type === 'error' ? 'rgba(229,57,53,0.15)' : 'var(--sos-bg-surface-2)',
              border: `1px solid ${t.type === 'success' ? '#4CAF50' : t.type === 'error' ? '#E53935' : '#333'}`,
            }}
            onClick={() => removeToast(t.id)}
          >
            <div>
              <div className="font-semibold text-sm text-white">{t.title}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--sos-text-secondary)' }}>{t.message}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function FlashOverlay() {
  const { showFlash } = useEmergency();
  return (
    <AnimatePresence>
      {showFlash && (
        <motion.div
          key="flash"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0.7, 0] }}
          transition={{ duration: 2, times: [0, 0.1, 0.8, 1] }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          style={{ background: 'rgba(229,57,53,0.6)' }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-white text-5xl font-black tracking-widest"
            style={{ textShadow: '0 0 40px #fff' }}
          >
            🚨 URGENCE 🚨
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SSEInitializer() {
  const { startEmergency, resolveEmergency, resolveEmergencyById, dispatchResolvedEmergency, addWorker, addToast, updateEmergencyFields, updateWorkerLocation } = useEmergency();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    setCompanyId(auth?.companyId || 'COMP-123'); // Fallback for demo
    setToken(getToken() || 'mock-token');
  }, []);

  useSSE(
    companyId,
    token,
    (type, data: any) => {
      console.log('SSE Event received:', type, data);
      if (type === 'EMERGENCY_STARTED' || type === 'emergency_started') {
        const emergencyData = data.emergency || data;
        const userData = data.user;
        const mappedEmergency = {
          id: emergencyData.id,
          workerId: emergencyData.user_id || 'unknown',
          type: emergencyData.type,
          severity: emergencyData.severity ? emergencyData.severity.toLowerCase() : 'critical',
          gpsCoordinates: (emergencyData.latitude !== undefined && emergencyData.longitude !== undefined && emergencyData.latitude !== null && emergencyData.longitude !== null) 
            ? { lat: Number(emergencyData.latitude), lng: Number(emergencyData.longitude) } 
            : undefined,
          location: emergencyData.location_description || 'Unknown location',
          status: emergencyData.status,
          startedAt: emergencyData.started_at,
          resolvedAt: emergencyData.resolved_at,
          workerName: userData ? userData.full_name : 'Unknown Worker',
          workerPhone: userData?.phone || undefined,
          workerBadge: userData?.employee_id || '',
          unit: userData?.unit || 'Non assignée',
          companyId: emergencyData.company_id || '',
          possible_duplicate_of: data.possible_duplicate_of || [],
          medicalProfile: data.medical_profile ? {
            bloodType: data.medical_profile.blood_type || 'Inconnu',
            allergies: data.medical_profile.allergies || [],
            chronicDiseases: data.medical_profile.chronic_diseases || [],
            medications: [],
            emergencyNotes: data.medical_profile.emergency_notes || '',
            iceContact: {
              name: data.medical_profile.ice_contact_name || '',
              relation: data.medical_profile.ice_contact_relation || '',
              phone: data.medical_profile.ice_contact_phone || '',
            },
            lastCheckup: data.medical_profile.updated_at || '',
          } : undefined
        };
        startEmergency(mappedEmergency as any);
      } else if (type === 'EMERGENCY_RESOLVED' || type === 'emergency_resolved') {
        const emergencyData = data.emergency || data;
        const userData = data.user;
        const mappedEmergency = {
          id: emergencyData.id,
          workerId: emergencyData.user_id || 'unknown',
          type: emergencyData.type,
          severity: emergencyData.severity ? emergencyData.severity.toLowerCase() : 'critical',
          gpsCoordinates: (emergencyData.latitude !== undefined && emergencyData.longitude !== undefined && emergencyData.latitude !== null && emergencyData.longitude !== null) 
            ? { lat: Number(emergencyData.latitude), lng: Number(emergencyData.longitude) } 
            : undefined,
          location: emergencyData.location_description || 'Unknown location',
          status: emergencyData.status || 'resolved',
          startedAt: emergencyData.started_at,
          resolvedAt: emergencyData.resolved_at || new Date().toISOString(),
          notes: emergencyData.notes,
          responderType: emergencyData.responder_type,
          etaMinutes: emergencyData.eta_minutes,
          workerName: userData ? userData.full_name : 'Unknown Worker',
          workerBadge: userData ? (userData.employee_id || '') : '',
          unit: userData?.unit || 'Non assigné',
          companyId: emergencyData.company_id || '',
        };
        // Use id-based resolve for active modals
        if (emergencyData.id) {
          resolveEmergencyById(emergencyData.id);
        }
        dispatchResolvedEmergency(mappedEmergency as any);

      // ── NEW: live GPS heartbeat from the worker ────────────────────────────
      } else if (type === 'HEARTBEAT_UPDATED') {
        updateEmergencyFields(data.emergency_id, {
          heartbeatLat:    data.latitude,
          heartbeatLng:    data.longitude,
          lastSeenActive:  data.last_seen_active,
          notResponding:   data.not_responding ?? false,
          gpsCoordinates:  { lat: data.latitude, lng: data.longitude },
        });

      // ── NEW: officer sent an "are you OK?" ping ───────────────────────────
      } else if (type === 'PING_SENT') {
        updateEmergencyFields(data.emergency_id, {
          pingStatus: 'sent',
        });

      // ── NEW: worker acknowledged the ping ─────────────────────────────────
      } else if (type === 'PING_ACKED') {
        updateEmergencyFields(data.emergency_id, {
          pingStatus:    'acked',
          notResponding: false,
        });
        addToast({
          type:    'success',
          title:   '✅ Travailleur répond',
          message: 'Le travailleur a confirmé qu\'il va bien.',
        });

      } else if (type === 'worker_registered') {
        // Map backend UserOut to frontend Worker type
        const newWorker = {
          id: data.id || Math.random().toString(36).slice(2),
          employeeId: data.employee_id || '',
          firstName: data.full_name ? data.full_name.split(' ')[0] : 'Nouveau',
          lastName: data.full_name ? data.full_name.split(' ').slice(1).join(' ') : 'Travailleur',
          unit: data.unit || 'Non assignée',
          department: data.department || 'Non défini',
          position: data.position || 'Employé',
          phone: data.phone || '',
          status: 'active',
          bloodType: 'Inconnu',
          lastSeen: data.last_seen || new Date().toISOString(),
          joinDate: data.created_at || new Date().toISOString(),
          companyId: data.company_id || '',
          medicalProfile: {
            bloodType: 'Inconnu',
            allergies: [],
            chronicDiseases: [],
            medications: [],
            emergencyNotes: '',
            iceContact: { name: '', relation: '', phone: '' },
            lastCheckup: ''
          }
        };
        addWorker(newWorker as any);
        addToast({
          type: 'info',
          title: 'Nouveau travailleur',
          message: `${newWorker.firstName} ${newWorker.lastName} s'est inscrit.`
        });
      } else if (type === 'WORKER_LOCATION_UPDATED' || type === 'UPDATE_WORKER_LOCATION' || type === 'worker_location_updated') {
        updateWorkerLocation({
          userId:      data.user_id || data.userId || data.worker_id || data.workerId || '',
          lat:         Number(data.lat ?? data.latitude ?? 0),
          lng:         Number(data.lng ?? data.longitude ?? 0),
          status:      (data.status as any) || 'active',
          fullName:    data.full_name || data.fullName || data.worker_name || data.workerName || 'Travailleur',
          employeeId:  data.employee_id || data.employeeId || '',
          updatedAt:   data.updated_at || data.updatedAt || data.last_updated || new Date().toISOString(),
        });
      } else if (type === 'NEW_MESSAGE' || type === 'new_message') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sos_new_message', { detail: data }));
        }
      }
    }
  );

  return null;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SSEInitializer />
      <FlashOverlay />
      <EmergencyModal />
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--sos-bg-base)' }}>
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--sos-bg-base)' }}>
            {children}
          </main>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}
