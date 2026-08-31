'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Phone, Heart, Bandage, Flame, Wind, Brain, Skull } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useEmergency } from '@/context/EmergencyContext';
import { getBloodTypeColor, getInitials, getWorkerStatusLabel, formatDateTime } from '@/lib/utils';
import type { Worker } from '@/types';
import { getAuth } from '@/lib/auth';
import { AddWorkerModal } from '@/components/workers/AddWorkerModal';
import { EditWorkerModal } from '@/components/workers/EditWorkerModal';
import { EditMedicalModal } from '@/components/workers/EditMedicalModal';

const STATUS_STYLES: Record<string, { color: string; bg: string; pulse?: boolean }> = {
  active: { color: '#4CAF50', bg: 'rgba(76,175,80,0.15)' },
  offline: { color: '#808080', bg: 'rgba(128,128,128,0.1)' },
  emergency: { color: '#E53935', bg: 'rgba(229,57,53,0.15)', pulse: true },
};

import { getEmergencies } from '@/lib/data-service';

function WorkerSidePanel({ 
  worker, 
  onClose,
  onEditProfile,
  onEditMedical,
  onDelete
}: { 
  worker: Worker; 
  onClose: () => void;
  onEditProfile: () => void;
  onEditMedical: () => void;
  onDelete: () => void;
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Only admins and officers can edit/delete
  const auth = getAuth();
  const canManage = auth?.role === 'super_admin' || auth?.role === 'company_admin' || auth?.role === 'safety_officer';

  React.useEffect(() => {
    let mounted = true;
    setLoadingHistory(true);
    getEmergencies({ user_id: worker.id })
      .then(res => {
        if (mounted) {
          setHistory(res);
          setLoadingHistory(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (mounted) setLoadingHistory(false);
      });
    return () => { mounted = false; };
  }, [worker.id]);

  const st = STATUS_STYLES[worker.status] || STATUS_STYLES.offline;
  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-screen w-96 overflow-y-auto z-40 shadow-2xl"
      style={{ background: 'var(--sos-bg-surface)', borderLeft: '1px solid var(--sos-border)' }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--sos-text-primary)' }}>Profil Travailleur</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--sos-bg-hover)]" style={{ background: 'var(--sos-bg-surface-2)', border: '1px solid var(--sos-border)' }}>
            <X className="w-4 h-4" style={{ color: 'var(--sos-text-secondary)' }} />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center mb-6 p-5 rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white mb-3" style={{ background: '#E53935' }}>
            {getInitials(worker.firstName, worker.lastName)}
          </div>
          <div className="text-xl font-bold" style={{ color: 'var(--sos-text-primary)' }}>{worker.firstName} {worker.lastName}</div>
          <div className="text-sm font-mono mt-1" style={{ color: 'var(--sos-text-secondary)' }}>{worker.employeeId}</div>
          <div className="mt-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}40` }}>
              {getWorkerStatusLabel(worker.status)}
            </span>
          </div>
        </div>

        {/* Action Buttons (Admin/Officer only) */}
        {canManage && (
          <div className="flex gap-2 mb-5">
            <button 
              onClick={onEditProfile}
              className="flex-1 py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
              style={{ borderColor: 'var(--sos-border)', color: 'var(--sos-text-primary)' }}
            >
              Modifier Profil
            </button>
            <button 
              onClick={onDelete}
              className="flex-1 py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
              style={{ borderColor: '#E5393540', color: '#EF5350', background: 'rgba(229,57,53,0.1)' }}
            >
              Désactiver
            </button>
          </div>
        )}

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
            <div key={label} className="flex justify-between items-start py-2" style={{ borderBottom: '1px solid var(--sos-border-subtle)' }}>
              <span className="text-xs" style={{ color: 'var(--sos-text-muted)' }}>{label}</span>
              <span className="text-sm text-right max-w-48 font-medium" style={{ color: 'var(--sos-text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Medical */}
        <div className="p-4 rounded-xl border relative" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--sos-text-muted)' }}>Profil Médical</div>
            {canManage && (
              <button 
                onClick={onEditMedical}
                className="text-xs font-bold hover:underline" 
                style={{ color: '#2196F3' }}
              >
                Modifier
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs" style={{ color: 'var(--sos-text-secondary)' }}>Groupe sanguin:</span>
            <span className="px-2 py-0.5 rounded text-xs font-black text-white" style={{ background: getBloodTypeColor(worker.medicalProfile.bloodType) }}>
              {worker.medicalProfile.bloodType}
            </span>
          </div>
          {worker.medicalProfile.allergies.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold mb-1" style={{ color: '#E53935' }}>⚠ ALLERGIES</div>
              <div className="flex flex-wrap gap-1">
                {worker.medicalProfile.allergies.map(a => (
                  <span key={a} className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'rgba(229,57,53,0.12)', color: '#EF5350' }}>{a}</span>
                ))}
              </div>
            </div>
          )}
          {worker.medicalProfile.chronicDiseases.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--sos-text-muted)' }}>Maladies chroniques</div>
              {worker.medicalProfile.chronicDiseases.map(d => (
                <div key={d} className="text-xs" style={{ color: 'var(--sos-text-secondary)' }}>• {d}</div>
              ))}
            </div>
          )}
          {worker.medicalProfile.emergencyNotes && (
            <div className="mb-3 p-2 rounded" style={{ background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.2)' }}>
              <div className="text-xs font-semibold" style={{ color: '#FF9800' }}>Notes</div>
              <div className="text-xs mt-1" style={{ color: 'var(--sos-text-secondary)' }}>{worker.medicalProfile.emergencyNotes}</div>
            </div>
          )}
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--sos-text-muted)' }}>Contact ICE</div>
            <div className="text-sm font-medium" style={{ color: 'var(--sos-text-primary)' }}>{worker.medicalProfile.iceContact.name}</div>
            <div className="text-xs" style={{ color: 'var(--sos-text-secondary)' }}>{worker.medicalProfile.iceContact.relation}</div>
            <a href={`tel:${worker.medicalProfile.iceContact.phone}`} className="flex items-center gap-1 mt-1 text-xs" style={{ color: '#2196F3' }}>
              <Phone className="w-3 h-3" /> {worker.medicalProfile.iceContact.phone}
            </a>
          </div>
        </div>

        {/* Emergency History */}
        <div className="p-4 rounded-xl border mt-5" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--sos-text-muted)' }}>Historique des urgences</div>
          {loadingHistory ? (
            <div className="text-sm italic" style={{ color: 'var(--sos-text-muted)' }}>Chargement...</div>
          ) : history.length > 0 ? (
            <div className="flex flex-col gap-3">
              {history.map(em => (
                <div key={em.id} className="p-3 rounded-lg border" style={{ background: 'var(--sos-bg-surface)', borderColor: 'var(--sos-border)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm uppercase" style={{ color: 'var(--sos-text-primary)' }}>{em.type}</span>
                    <span className="text-xs" style={{ color: 'var(--sos-text-muted)' }}>
                      {new Date(em.started_at || em.startedAt).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-xs mb-1" style={{ color: 'var(--sos-text-secondary)' }}>
                    Statut: <span className="font-semibold">{em.status === 'resolved' ? 'Résolue' : em.status}</span>
                  </div>
                  {em.responder_type && (
                    <div className="text-xs mb-1" style={{ color: 'var(--sos-text-secondary)' }}>
                      Intervenant: <span className="font-semibold capitalize">{em.responder_type}</span> 
                      {em.eta_minutes ? ` (${em.eta_minutes} min)` : ''}
                    </div>
                  )}
                  {em.notes && (
                    <div className="text-xs italic mt-2" style={{ color: 'var(--sos-text-muted)' }}>
                      "{em.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm italic" style={{ color: 'var(--sos-text-muted)' }}>Aucune urgence enregistrée</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function WorkersPage() {
  const { workers, company, isLoading, authError, deleteWorker } = useEmergency();
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [selected, setSelected] = useState<Worker | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditMedicalModal, setShowEditMedicalModal] = useState(false);

  const handleDelete = async (worker: Worker) => {
    if (confirm(`Êtes-vous sûr de vouloir désactiver le compte de ${worker.firstName} ${worker.lastName} ?`)) {
      try {
        await deleteWorker(worker.id);
        if (selected?.id === worker.id) setSelected(null);
      } catch (err: any) {
        alert(err.message || 'Erreur lors de la désactivation');
      }
    }
  };

  if (authError) {
    return <DashboardLayout><div className="flex h-full items-center justify-center text-red-500 font-bold text-2xl tracking-widest">{authError}</div></DashboardLayout>;
  }

  if (isLoading || !company) {
    return <DashboardLayout><div className="p-8" style={{ color: 'var(--sos-text-primary)' }}>Chargement...</div></DashboardLayout>;
  }

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
            <h1 className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>Travailleurs</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>
              <span className="font-bold" style={{ color: '#4CAF50' }}>{company.currentWorkers}</span>
              <span style={{ color: 'var(--sos-text-muted)' }}>/{company.maxWorkers}</span> travailleurs enregistrés
            </p>
          </div>
          <button
            id="btn-add-worker"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90"
            style={{ 
              background: company.currentWorkers >= company.maxWorkers ? 'var(--sos-border)' : 'var(--sos-accent)', 
              color: company.currentWorkers >= company.maxWorkers ? 'var(--sos-text-muted)' : '#fff',
              cursor: company.currentWorkers >= company.maxWorkers ? 'not-allowed' : 'pointer' 
            }}
            disabled={company.currentWorkers >= company.maxWorkers}
            title={company.currentWorkers >= company.maxWorkers ? 'Limite atteinte. Contactez le support pour upgrade.' : ''}
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4" /> Ajouter un travailleur
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sos-text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher par nom ou ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }}
            />
          </div>
          <select
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: unitFilter ? 'var(--sos-text-primary)' : 'var(--sos-text-secondary)' }}
          >
            <option value="">Toutes les unités</option>
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', boxShadow: 'var(--sos-shadow)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--sos-border)' }}>
                {['', 'Nom', 'ID Employé', 'Unité', 'Statut', 'Groupe Sanguin', 'Dernière activité', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--sos-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, i) => {
                const st = STATUS_STYLES[w.status] || STATUS_STYLES.offline;
                return (
                  <tr key={w.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--sos-border-subtle)' : undefined, cursor: 'pointer' }}
                    onClick={() => setSelected(w)}
                    className="hover:bg-[var(--sos-bg-hover)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#E53935' }}>
                        {getInitials(w.firstName, w.lastName)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--sos-text-primary)' }}>{w.firstName} {w.lastName}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--sos-text-muted)' }}>{w.employeeId}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--sos-text-secondary)' }}>{w.unit}</td>
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
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--sos-text-muted)' }}>{formatDateTime(w.lastSeen)}</td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); setSelected(w); }} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ background: 'var(--sos-bg-hover)', color: 'var(--sos-text-secondary)', border: '1px solid var(--sos-border)' }}>
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

      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <WorkerSidePanel 
              worker={selected} 
              onClose={() => setSelected(null)} 
              onEditProfile={() => setShowEditModal(true)}
              onEditMedical={() => setShowEditMedicalModal(true)}
              onDelete={() => handleDelete(selected)}
            />
          </>
        )}

        {showAddModal && (
          <AddWorkerModal onClose={() => setShowAddModal(false)} />
        )}

        {showEditModal && selected && (
          <EditWorkerModal 
            worker={selected} 
            onClose={() => setShowEditModal(false)} 
            onSuccess={(updated) => setSelected(updated)}
          />
        )}

        {showEditMedicalModal && selected && (
          <EditMedicalModal 
            worker={selected} 
            onClose={() => setShowEditMedicalModal(false)} 
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
