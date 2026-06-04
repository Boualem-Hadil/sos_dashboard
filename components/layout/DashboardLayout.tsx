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
              background: t.type === 'success' ? 'rgba(76,175,80,0.15)' : t.type === 'error' ? 'rgba(229,57,53,0.15)' : '#1A1A1A',
              border: `1px solid ${t.type === 'success' ? '#4CAF50' : t.type === 'error' ? '#E53935' : '#333'}`,
            }}
            onClick={() => removeToast(t.id)}
          >
            <div>
              <div className="font-semibold text-sm text-white">{t.title}</div>
              <div className="text-xs mt-0.5" style={{ color: '#B0B0B0' }}>{t.message}</div>
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
  const { startEmergency, resolveEmergency, addWorker, addToast } = useEmergency();
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
      if (type === 'EMERGENCY_STARTED') {
        const emergencyData = data.emergency;
        const userData = data.user;
        const mappedEmergency = {
          id: emergencyData.id,
          workerId: emergencyData.user_id || 'unknown',
          type: emergencyData.type,
          severity: emergencyData.severity.toLowerCase(),
          location: emergencyData.location_description || 'Unknown location',
          status: emergencyData.status,
          startedAt: emergencyData.started_at,
          resolvedAt: emergencyData.resolved_at,
          workerName: userData ? userData.full_name : 'Unknown Worker',
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
      } else if (type === 'EMERGENCY_RESOLVED') {
        resolveEmergency();
      } else if (type === 'worker_registered') {
        // Map backend UserOut to frontend Worker type
        const newWorker = {
          id: data.id || Math.random().toString(36).slice(2),
          employeeId: data.employee_id || '',
          firstName: data.full_name ? data.full_name.split(' ')[0] : 'Nouveau',
          lastName: data.full_name ? data.full_name.split(' ').slice(1).join(' ') : 'Travailleur',
          unit: 'Non assignée',
          department: 'Non défini',
          position: 'Employé',
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
      <div className="flex h-screen overflow-hidden" style={{ background: '#0A0A0A' }}>
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-6" style={{ background: '#0A0A0A' }}>
            {children}
          </main>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}
