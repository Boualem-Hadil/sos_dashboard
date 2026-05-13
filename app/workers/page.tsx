'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Phone, Heart, Bandage, Flame, Wind, Brain, Skull } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useEmergency } from '@/context/EmergencyContext';
import { getBloodTypeColor, getInitials, getWorkerStatusLabel, formatDateTime } from '@/lib/utils';
import { COMPANIES } from '@/lib/mock-data';
import type { Worker } from '@/types';

const STATUS_STYLES: Record<string, { color: string; bg: string; pulse?: boolean }> = {
  active: { color: '#4CAF50', bg: 'rgba(76,175,80,0.15)' },
  offline: { color: '#808080', bg: 'rgba(128,128,128,0.1)' },
  emergency: { color: '#E53935', bg: 'rgba(229,57,53,0.15)', pulse: true },
};

function WorkerSidePanel({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const st = STATUS_STYLES[worker.status];
  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-screen w-96 overflow-y-auto z-40 shadow-2xl"
      style={{ background: '#111111', borderLeft: '1px solid #222' }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Profil Travailleur</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1A1A1A' }}>
            <X className="w-4 h-4" style={{ color: '#808080' }} />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center mb-6 p-5 rounded-xl" style={{ background: '#1A1A1A' }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white mb-3" style={{ background: '#E53935' }}>
            {getInitials(worker.firstName, worker.lastName)}
          </div>
          <div className="text-xl font-bold text-white">{worker.firstName} {worker.lastName}</div>
          <div className="text-sm font-mono mt-1" style={{ color: '#808080' }}>{worker.employeeId}</div>
          <div className="mt-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}40` }}>
              {getWorkerStatusLabel(worker.status)}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-3 mb-5">
          {[
            { label: 'Unité', value: worker.unit },
            { label: 'Département', value: worker.department },
            { label: 'Poste', value: worker.position },
            { label: 'Téléphone', value: worker.phone },
            { label: 'Dernière activité', value: formatDateTime(worker.lastSeen) },
            { label: 'Date d\'embauche', value: new Date(worker.joinDate).toLocaleDateString('fr-DZ') },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-start py-2" style={{ borderBottom: '1px solid #1E1E1E' }}>
              <span className="text-xs" style={{ color: '#808080' }}>{label}</span>
              <span className="text-sm text-white text-right max-w-48">{value}</span>
            </div>
          ))}
        </div>

        {/* Medical */}
        <div className="p-4 rounded-xl" style={{ background: '#1A1A1A', border: '1px solid #222' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#808080' }}>Profil Médical</div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs" style={{ color: '#B0B0B0' }}>Groupe sanguin:</span>
            <span className="px-2 py-0.5 rounded text-xs font-black text-white" style={{ background: getBloodTypeColor(worker.medicalProfile.bloodType) }}>
              {worker.medicalProfile.bloodType}
            </span>
          </div>
          {worker.medicalProfile.allergies.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold mb-1" style={{ color: '#E53935' }}>⚠ ALLERGIES</div>
              <div className="flex flex-wrap gap-1">
                {worker.medicalProfile.allergies.map(a => (
                  <span key={a} className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(229,57,53,0.15)', color: '#EF5350' }}>{a}</span>
                ))}
              </div>
            </div>
          )}
          {worker.medicalProfile.chronicDiseases.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold mb-1" style={{ color: '#808080' }}>Maladies chroniques</div>
              {worker.medicalProfile.chronicDiseases.map(d => (
                <div key={d} className="text-xs" style={{ color: '#B0B0B0' }}>• {d}</div>
              ))}
            </div>
          )}
          {worker.medicalProfile.emergencyNotes && (
            <div className="mb-3 p-2 rounded" style={{ background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.2)' }}>
              <div className="text-xs font-semibold" style={{ color: '#FF9800' }}>Notes</div>
              <div className="text-xs mt-1" style={{ color: '#B0B0B0' }}>{worker.medicalProfile.emergencyNotes}</div>
            </div>
          )}
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: '#808080' }}>Contact ICE</div>
            <div className="text-sm text-white">{worker.medicalProfile.iceContact.name}</div>
            <div className="text-xs" style={{ color: '#808080' }}>{worker.medicalProfile.iceContact.relation}</div>
            <a href={`tel:${worker.medicalProfile.iceContact.phone}`} className="flex items-center gap-1 mt-1 text-xs" style={{ color: '#2196F3' }}>
              <Phone className="w-3 h-3" /> {worker.medicalProfile.iceContact.phone}
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function WorkersPage() {
  const { workers } = useEmergency();
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [selected, setSelected] = useState<Worker | null>(null);
  const company = COMPANIES[0];

  const units = [...new Set(workers.map(w => w.unit))];
  const filtered = workers.filter(w => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${w.firstName} ${w.lastName} ${w.employeeId}`.toLowerCase().includes(q);
    const matchUnit = !unitFilter || w.unit === unitFilter;
    return matchSearch && matchUnit;
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Travailleurs</h1>
            <p className="text-sm mt-1" style={{ color: '#808080' }}>
              <span className="font-bold" style={{ color: '#4CAF50' }}>{company.currentWorkers}</span>
              <span style={{ color: '#555' }}>/{company.maxWorkers}</span> travailleurs enregistrés
            </p>
          </div>
          <button
            id="btn-add-worker"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90"
            style={{ background: company.currentWorkers >= company.maxWorkers ? '#333' : '#E53935', cursor: company.currentWorkers >= company.maxWorkers ? 'not-allowed' : 'pointer' }}
            disabled={company.currentWorkers >= company.maxWorkers}
            title={company.currentWorkers >= company.maxWorkers ? 'Limite atteinte. Contactez le support pour upgrade.' : ''}
          >
            <Plus className="w-4 h-4" /> Ajouter un travailleur
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#555' }} />
            <input
              type="text"
              placeholder="Rechercher par nom ou ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-white text-sm outline-none"
              style={{ background: '#111111', border: '1px solid #222', color: '#fff' }}
            />
          </div>
          <select
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#111111', border: '1px solid #222', color: unitFilter ? '#fff' : '#808080' }}
          >
            <option value="">Toutes les unités</option>
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #222' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #1A1A1A' }}>
                {['', 'Nom', 'ID Employé', 'Unité', 'Statut', 'Groupe Sanguin', 'Dernière activité', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, i) => {
                const st = STATUS_STYLES[w.status];
                return (
                  <tr key={w.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #1A1A1A' : undefined, cursor: 'pointer' }}
                    onClick={() => setSelected(w)}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#E53935' }}>
                        {getInitials(w.firstName, w.lastName)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{w.firstName} {w.lastName}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#808080' }}>{w.employeeId}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#B0B0B0' }}>{w.unit}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"
                        style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}40`, animation: st.pulse ? 'badge-pulse 1.2s infinite' : undefined }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
                        {getWorkerStatusLabel(w.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-black text-white" style={{ background: getBloodTypeColor(w.bloodType) }}>{w.bloodType}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#808080' }}>{formatDateTime(w.lastSeen)}</td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); setSelected(w); }} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#1A1A1A', color: '#B0B0B0', border: '1px solid #333' }}>
                        Voir profil
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side panel overlay */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setSelected(null)} />
            <WorkerSidePanel worker={selected} onClose={() => setSelected(null)} />
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
