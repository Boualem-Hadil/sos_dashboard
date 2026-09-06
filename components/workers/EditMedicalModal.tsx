'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HeartPulse } from 'lucide-react';
import { useEmergency } from '@/context/EmergencyContext';
import type { Worker } from '@/types';
import type { UpdateMedicalPayload } from '@/context/EmergencyContext';

interface Props {
  worker: Worker;
  onClose: () => void;
}

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

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function EditMedicalModal({ worker, onClose }: Props) {
  const { updateMedicalProfile, addToast } = useEmergency();

  const [form, setForm] = useState<UpdateMedicalPayload>({
    blood_type: worker.medicalProfile?.bloodType || 'O+',
    is_universal_donor: false,
    chronic_diseases: worker.medicalProfile?.chronicDiseases || [],
    allergies: worker.medicalProfile?.allergies || [],
    emergency_notes: worker.medicalProfile?.emergencyNotes || '',
    ice_contact_name: worker.medicalProfile?.iceContact?.name || '',
    ice_contact_relation: worker.medicalProfile?.iceContact?.relation || '',
    ice_contact_phone: worker.medicalProfile?.iceContact?.phone || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [allergyInput, setAllergyInput] = useState('');
  const [diseaseInput, setDiseaseInput] = useState('');

  const setStr = (key: keyof UpdateMedicalPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await updateMedicalProfile(worker.id, form);
      addToast({
        type: 'success',
        title: '✓ Profil médical mis à jour',
        message: `Les informations médicales de ${worker.firstName} ont été enregistrées.`,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur : ${msg}`);
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
                <HeartPulse className="w-4 h-4" style={{ color: '#E53935' }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Profil Médical</h2>
                <p className="text-xs" style={{ color: '#555' }}>{worker.firstName} {worker.lastName}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
              <X className="w-4 h-4" style={{ color: '#555' }} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {/* Blood Type */}
            <div>
              <label style={LABEL_STYLE}>Groupe Sanguin</label>
              <select
                style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                value={form.blood_type}
                onChange={setStr('blood_type')}
              >
                {BLOOD_TYPES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Allergies */}
            <div>
              <label style={LABEL_STYLE}>Allergies</label>
              <div className="flex gap-2 mb-2">
                <input
                  style={INPUT_STYLE}
                  placeholder="ex. Pénicilline"
                  value={allergyInput}
                  onChange={e => setAllergyInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (allergyInput.trim()) {
                        setForm(f => ({ ...f, allergies: [...(f.allergies || []), allergyInput.trim()] }));
                        setAllergyInput('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (allergyInput.trim()) {
                      setForm(f => ({ ...f, allergies: [...(f.allergies || []), allergyInput.trim()] }));
                      setAllergyInput('');
                    }
                  }}
                  className="px-4 rounded-lg bg-[#2A2A2A] text-white hover:bg-[#333]"
                >
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.allergies?.map((a, i) => (
                  <span key={i} className="px-2 py-1 rounded-md text-xs bg-[#E5393520] text-[#EF5350] border border-[#E5393540] flex items-center gap-2">
                    {a}
                    <button type="button" onClick={() => setForm(f => ({ ...f, allergies: f.allergies?.filter((_, index) => index !== i) }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Diseases */}
            <div>
              <label style={LABEL_STYLE}>Maladies Chroniques</label>
              <div className="flex gap-2 mb-2">
                <input
                  style={INPUT_STYLE}
                  placeholder="ex. Asthme"
                  value={diseaseInput}
                  onChange={e => setDiseaseInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (diseaseInput.trim()) {
                        setForm(f => ({ ...f, chronic_diseases: [...(f.chronic_diseases || []), diseaseInput.trim()] }));
                        setDiseaseInput('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (diseaseInput.trim()) {
                      setForm(f => ({ ...f, chronic_diseases: [...(f.chronic_diseases || []), diseaseInput.trim()] }));
                      setDiseaseInput('');
                    }
                  }}
                  className="px-4 rounded-lg bg-[#2A2A2A] text-white hover:bg-[#333]"
                >
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.chronic_diseases?.map((a, i) => (
                  <span key={i} className="px-2 py-1 rounded-md text-xs bg-[#FF980020] text-[#FFB74D] border border-[#FF980040] flex items-center gap-2">
                    {a}
                    <button type="button" onClick={() => setForm(f => ({ ...f, chronic_diseases: f.chronic_diseases?.filter((_, index) => index !== i) }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* ICE Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={LABEL_STYLE}>Contact Urgence (Nom)</label>
                <input
                  style={INPUT_STYLE}
                  value={form.ice_contact_name}
                  onChange={setStr('ice_contact_name')}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Relation</label>
                <input
                  style={INPUT_STYLE}
                  placeholder="ex. Épouse"
                  value={form.ice_contact_relation}
                  onChange={setStr('ice_contact_relation')}
                />
              </div>
            </div>
            <div>
              <label style={LABEL_STYLE}>Téléphone Contact Urgence</label>
              <input
                style={INPUT_STYLE}
                value={form.ice_contact_phone}
                onChange={setStr('ice_contact_phone')}
              />
            </div>

            {/* Notes */}
            <div>
              <label style={LABEL_STYLE}>Notes d'urgence</label>
              <textarea
                style={{ ...INPUT_STYLE, minHeight: '80px', resize: 'vertical' }}
                value={form.emergency_notes}
                onChange={setStr('emergency_notes')}
              />
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
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{
                  background: loading ? '#333' : '#E53935',
                  border: loading ? '1px solid #444' : 'none',
                  color: loading ? '#888' : '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
