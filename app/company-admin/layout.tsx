'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { CompanyAdminSidebar } from '@/components/layout/CompanyAdminSidebar';
import { Navbar } from '@/components/layout/Navbar';
import { useEmergency } from '@/context/EmergencyContext';
import { getAuth } from '@/lib/auth';

// -- Toast re-used from the existing context ----
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

export default function CompanyAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    if (!auth) { router.replace('/login'); return; }
    if (auth.role !== 'company_admin' && auth.role !== 'super_admin') {
      router.replace('/');
    }
  }, [router]);

  return (
    <>
      {/* NOTE: No SSEInitializer, FlashOverlay, or EmergencyModal here.
          Live emergency dispatch stays exclusive to the safety_officer dashboard. */}
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--sos-bg-base)' }}>
        <CompanyAdminSidebar />
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
