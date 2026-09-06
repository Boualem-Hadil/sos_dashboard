'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil } from 'lucide-react';
import { useEmergency } from '@/context/EmergencyContext';
import type { UpdateWorkerPayload } from '@/context/EmergencyContext';
import type { Worker } from '@/types';

interface Props {
  worker: Worker;
  onClose: () => void;
  onSuccess?: (updated: Worker) => void;
}

const ROLES = [
  { value: 'worker', label: 'Travailleur' },
  { value: 'safety_officer', label: 'Agent de sécurité' },
  { value: 'company_admin', label: 'Administrateur' },
];

const INPUT_STYLE = {
  background: '#0D0D0D',
  border: '1px solid #2A2A2A',
  color: '#fff',
  borderRadius: '10px',
  padding: '10px 14px',
  width: '100%',
  fontSize: '14px',
  outline: 'none',
} as const;

const LABEL_STYLE = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#808080',
  marginBottom: '6px',
  display: 'block',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

export function EditWorkerModal({ worker, onClose, onSuccess }: Props) {
  const { updateWorker, addToast } = useEmergency();

  const [form, setForm] = useState<UpdateWorkerPayload>({
    fullName: `${worker.firstName} ${worker.lastName}`.trim(),
    employeeId: worker.employeeId,
    phone: worker.phone === 'Non spécifié' ? '' : worker.phone,
    unit: worker.unit === 'Unité non spécifiée' ? '' : worker.unit,
    department: worker.department === 'Département non spécifié' ? '' : worker.department,
    position: worker.position === 'Poste non spécifié' ? '' : worker.position,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof UpdateWorkerPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.fullName?.trim()) { setError('Le nom complet est requis.'); return; }
    if (!form.employeeId?.trim()) { setError("L'ID employé est requis."); return; }

    setLoading(true);
    try {
      const updated = await updateWorker(worker.id, form);
      if (updated) {
        addToast({
          type: 'success',
          title: '✓ Profil mis à jour',
          message: `${updated.firstName} ${updated.lastName} a été modifié avec succès.`,
        });
        onSuccess?.(updated);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      if (msg.includes('409') || msg.toLowerCase().includes('already exists')) {
        setError("Cet ID employé existe déjà dans l'entreprise.");
      } else {
        setError(`Erreur : ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: '#111111', border: '1px solid #222' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #1A1A1A' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(33,150,243,0.12)', border: '1px solid rgba(33,150,243,0.25)' }}>
                <Pencil className="w-4 h-4" style={{ color: '#2196F3' }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Modifier le travailleur</h2>
                <p className="text-xs" style={{ color: '#555' }}>{worker.firstName} {worker.lastName} · {worker.employeeId}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
              <X className="w-4 h-4" style={{ color: '#555' }} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {/* Full name */}
            <div>
              <label style={LABEL_STYLE}>Nom complet *</label>
              <input
                id="edit-worker-fullname"
                style={INPUT_STYLE}
                value={form.fullName}
                onChange={set('fullName')}
                autoFocus
              />
            </div>

            {/* Employee ID + phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={LABEL_STYLE}>ID Employé *</label>
                <input
                  id="edit-worker-empid"
                  style={INPUT_STYLE}
                  value={form.employeeId}
                  onChange={set('employeeId')}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Téléphone</label>
                <input
                  id="edit-worker-phone"
                  style={INPUT_STYLE}
                  placeholder="+213 xxx xxx xxx"
                  value={form.phone}
                  onChange={set('phone')}
                />
              </div>
            </div>

            {/* Unit + department */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={LABEL_STYLE}>Unité</label>
                <input
                  id="edit-worker-unit"
                  style={INPUT_STYLE}
                  value={form.unit}
                  onChange={set('unit')}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Département</label>
                <input
                  id="edit-worker-dept"
                  style={INPUT_STYLE}
                  value={form.department}
                  onChange={set('department')}
                />
              </div>
            </div>

            {/* Position + role */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={LABEL_STYLE}>Poste</label>
                <input
                  id="edit-worker-position"
                  style={INPUT_STYLE}
                  value={form.position}
                  onChange={set('position')}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Rôle</label>
                <select
                  id="edit-worker-role"
                  style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                  value={form.role ?? ''}
                  onChange={set('role')}
                >
                  <option value="">— Inchangé —</option>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-3 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.2)', color: '#EF5350' }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: '#1A1A1A', color: '#808080', border: '1px solid #2A2A2A' }}
              >
                Annuler
              </button>
              <button
                id="edit-worker-submit"
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{
                  background: loading ? '#1A1A1A' : 'rgba(33,150,243,0.15)',
                  border: loading ? '1px solid #2A2A2A' : '1px solid rgba(33,150,243,0.4)',
                  color: loading ? '#555' : '#2196F3',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#555' }} />
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <Pencil className="w-3.5 h-3.5" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
