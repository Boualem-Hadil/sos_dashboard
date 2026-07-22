'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Phone, Printer } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useEmergency } from '@/context/EmergencyContext';
import { getBloodTypeColor, getInitials } from '@/lib/utils';
import type { Worker } from '@/types';

function MedicalModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const mp = worker.medicalProfile;
  const btColor = getBloodTypeColor(mp.bloodType);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl print-card border"
        style={{ background: 'var(--sos-bg-surface)', borderColor: 'var(--sos-border)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 flex items-start justify-between" style={{ borderBottom: '1px solid var(--sos-border)' }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white" style={{ background: '#E53935' }}>
              {getInitials(worker.firstName, worker.lastName)}
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: 'var(--sos-text-primary)' }}>{worker.firstName} {worker.lastName}</div>
              <div className="text-sm font-mono" style={{ color: 'var(--sos-text-secondary)' }}>{worker.employeeId} — {worker.unit}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button onClick={() => window.print()} className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--sos-bg-hover)]" style={{ background: 'var(--sos-bg-surface-2)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-secondary)' }}>
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--sos-bg-hover)]" style={{ background: 'var(--sos-bg-surface-2)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-secondary)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          {/* Blood type — large badge */}
          <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white" style={{ background: btColor, boxShadow: `0 0 20px ${btColor}66` }}>
              {mp.bloodType}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--sos-text-primary)' }}>Groupe Sanguin</div>
              <div className="text-xs mt-1" style={{ color: 'var(--sos-text-secondary)' }}>Dernier bilan: {new Date(mp.lastCheckup).toLocaleDateString('fr-DZ')}</div>
            </div>
          </div>

          {/* Allergies — red highlighted */}
          <div className="p-4 rounded-xl" style={{ background: 'rgba(229,57,53,0.06)', border: '1px solid rgba(229,57,53,0.2)' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#E53935' }}>⚠ ALLERGIES (CRITIQUE)</div>
            {mp.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {mp.allergies.map(a => (
                  <span key={a} className="px-3 py-1 rounded-lg text-sm font-bold border" style={{ background: 'rgba(229,57,53,0.12)', color: '#E53935', borderColor: 'rgba(229,57,53,0.2)' }}>{a}</span>
                ))}
              </div>
            ) : <span className="text-sm" style={{ color: '#4CAF50' }}>Aucune allergie connue</span>}
          </div>

          {/* Chronic diseases */}
          <div className="p-4 rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--sos-text-muted)' }}>Maladies Chroniques</div>
            {mp.chronicDiseases.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {mp.chronicDiseases.map(d => <li key={d} className="text-sm" style={{ color: 'var(--sos-text-primary)' }}>• {d}</li>)}
              </ul>
            ) : <span className="text-sm" style={{ color: '#4CAF50' }}>Aucune maladie chronique</span>}
          </div>

          {/* Medications */}
          {mp.medications.length > 0 && (
            <div className="p-4 rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--sos-text-muted)' }}>Médicaments</div>
              <ul className="flex flex-col gap-1">
                {mp.medications.map(m => <li key={m} className="text-sm" style={{ color: 'var(--sos-text-primary)' }}>• {m}</li>)}
              </ul>
            </div>
          )}

          {/* Emergency notes */}
          {mp.emergencyNotes && (
            <div className="p-4 rounded-xl border" style={{ background: 'rgba(255,152,0,0.06)', borderColor: 'rgba(255,152,0,0.2)' }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#FF9800' }}>Notes d&apos;urgence</div>
              <p className="text-sm" style={{ color: 'var(--sos-text-secondary)' }}>{mp.emergencyNotes}</p>
            </div>
          )}

          {/* ICE contact */}
          <div className="p-4 rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--sos-text-muted)' }}>Contact d&apos;urgence (ICE)</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-bold" style={{ color: 'var(--sos-text-primary)' }}>{mp.iceContact.name}</div>
                <div className="text-sm" style={{ color: 'var(--sos-text-secondary)' }}>{mp.iceContact.relation}</div>
              </div>
              <a href={`tel:${mp.iceContact.phone}`} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition-opacity hover:opacity-90" style={{ background: '#4CAF50' }}>
                <Phone className="w-4 h-4" /> {mp.iceContact.phone}
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MedicalProfilesPage() {
  const { workers } = useEmergency();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Worker | null>(null);

  const filtered = workers.filter(w => {
    const q = search.toLowerCase();
    return !q || `${w.firstName} ${w.lastName} ${w.bloodType}`.toLowerCase().includes(q);
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>Profils Médicaux</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>Données médicales de tous les travailleurs</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sos-text-muted)' }} />
          <input type="text" placeholder="Nom ou groupe sanguin..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }} />
        </div>

        <div className="grid grid-cols-4 gap-4">
          {filtered.map(w => {
            const btColor = getBloodTypeColor(w.medicalProfile.bloodType);
            const hasAllergies = w.medicalProfile.allergies.length > 0;
            return (
              <motion.div key={w.id} whileHover={{ y: -2, scale: 1.01 }} onClick={() => setSelected(w)}
                className="rounded-xl p-5 cursor-pointer transition-all border"
                style={{ background: 'var(--sos-bg-surface)', borderColor: 'var(--sos-border)', boxShadow: 'var(--sos-shadow)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#E53935' }}>
                    {getInitials(w.firstName, w.lastName)}
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--sos-text-primary)' }}>{w.firstName} {w.lastName}</div>
                    <div className="text-xs font-mono" style={{ color: 'var(--sos-text-muted)' }}>{w.employeeId}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs" style={{ color: 'var(--sos-text-secondary)' }}>Groupe sanguin</span>
                  <span className="px-3 py-1 rounded-lg text-sm font-black text-white" style={{ background: btColor }}>{w.medicalProfile.bloodType}</span>
                </div>
                {hasAllergies ? (
                  <div>
                    <div className="text-xs font-bold mb-1" style={{ color: '#E53935' }}>⚠ Allergies</div>
                    <div className="flex flex-wrap gap-1">
                      {w.medicalProfile.allergies.slice(0, 2).map(a => (
                        <span key={a} className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'rgba(229,57,53,0.12)', color: '#EF5350' }}>{a}</span>
                      ))}
                      {w.medicalProfile.allergies.length > 2 && <span className="text-xs font-semibold" style={{ color: '#E53935' }}>+{w.medicalProfile.allergies.length - 2}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-semibold" style={{ color: '#4CAF50' }}>✓ Aucune allergie</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
      <AnimatePresence>{selected && <MedicalModal worker={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
    </DashboardLayout>
  );
}
