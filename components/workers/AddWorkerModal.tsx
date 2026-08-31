'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useEmergency } from '@/context/EmergencyContext';
import type { AddWorkerPayload } from '@/context/EmergencyContext';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
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
  transition: 'border-color 0.2s',
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

export function AddWorkerModal({ onClose, onSuccess }: Props) {
  const { addWorker, addToast } = useEmergency();

  const [form, setForm] = useState<AddWorkerPayload>({
    fullName: '',
    employeeId: '',
    password: '',
    phone: '',
    unit: '',
    department: '',
    position: '',
    role: 'worker',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof AddWorkerPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim()) { setError('Le nom complet est requis.'); return; }
    if (!form.employeeId.trim()) { setError("L'ID employé est requis."); return; }
    if (!form.password || form.password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }

    setLoading(true);
    try {
      const worker = await addWorker(form);
      if (worker) {
        addToast({
          type: 'success',
          title: '✓ Travailleur ajouté',
          message: `${worker.firstName} ${worker.lastName} a été créé avec succès.`,
        });
        onSuccess?.();
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      if (msg.includes('409') || msg.toLowerCase().includes('already exists')) {
        setError("Cet ID employé existe déjà dans l'entreprise.");
      } else if (msg.includes('403') || msg.toLowerCase().includes('limit')) {
        setError('Limite de travailleurs atteinte. Contactez le support.');
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
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.3)' }}>
                <UserPlus className="w-4 h-4" style={{ color: '#E53935' }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Ajouter un travailleur</h2>
                <p className="text-xs" style={{ color: '#555' }}>Créer un nouveau compte</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
              <X className="w-4 h-4" style={{ color: '#555' }} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {/* Row: full name */}
            <div>
              <label style={LABEL_STYLE}>Nom complet *</label>
              <input
                id="add-worker-fullname"
                style={INPUT_STYLE}
                placeholder="ex. Ahmed Benali"
                value={form.fullName}
                onChange={set('fullName')}
                autoFocus
              />
            </div>

            {/* Row: employee ID + phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={LABEL_STYLE}>ID Employé *</label>
                <input
                  id="add-worker-empid"
                  style={INPUT_STYLE}
                  placeholder="EMP-001"
                  value={form.employeeId}
                  onChange={set('employeeId')}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Téléphone</label>
                <input
                  id="add-worker-phone"
                  style={INPUT_STYLE}
                  placeholder="+213 xxx xxx xxx"
                  value={form.phone}
                  onChange={set('phone')}
                />
              </div>
            </div>

            {/* Row: unit + department */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={LABEL_STYLE}>Unité</label>
                <input
                  id="add-worker-unit"
                  style={INPUT_STYLE}
                  placeholder="ex. Forage Alpha"
                  value={form.unit}
                  onChange={set('unit')}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Département</label>
                <input
                  id="add-worker-dept"
                  style={INPUT_STYLE}
                  placeholder="ex. Opérations"
                  value={form.department}
                  onChange={set('department')}
                />
              </div>
            </div>

            {/* Row: position + role */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={LABEL_STYLE}>Poste</label>
                <input
                  id="add-worker-position"
                  style={INPUT_STYLE}
                  placeholder="ex. Technicien"
                  value={form.position}
                  onChange={set('position')}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Rôle</label>
                <select
                  id="add-worker-role"
                  style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                  value={form.role}
                  onChange={set('role')}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={LABEL_STYLE}>Mot de passe initial *</label>
              <div className="relative">
                <input
                  id="add-worker-password"
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...INPUT_STYLE, paddingRight: '42px' }}
                  placeholder="Min. 6 caractères"
                  value={form.password}
                  onChange={set('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" style={{ color: '#555' }} />
                    : <Eye className="w-4 h-4" style={{ color: '#555' }} />}
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: '#555' }}>
                Le travailleur pourra changer son mot de passe lors de la première connexion.
              </p>
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
                id="add-worker-submit"
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{
                  background: loading ? '#333' : 'linear-gradient(135deg, #E53935, #B71C1C)',
                  border: loading ? '1px solid #444' : 'none',
                  color: loading ? '#888' : '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#888' }} />
                    Création...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Créer le compte
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
