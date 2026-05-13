'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useEmergency } from '@/context/EmergencyContext';
import { useSSE } from '@/hooks/useSSE';

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
  useSSE();
  return null;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SSEInitializer />
      <FlashOverlay />
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
