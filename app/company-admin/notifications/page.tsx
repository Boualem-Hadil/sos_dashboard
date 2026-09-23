'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Trash2, Mail, Info, X } from 'lucide-react';
import { caGetNotifications, caAddNotification, caRemoveNotification } from '@/lib/company-admin-service';
import { useEmergency } from '@/context/EmergencyContext';
import type { NotificationRecipientCA } from '@/types';

function AddRecipientModal({ onClose, onSave }: { onClose: () => void, onSave: (data: { email: string, name: string }) => Promise<void> }) {
  const [form, setForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e: any) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setLoading(true);
    await onSave(form);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: '#111', border: '1px solid #222' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-white">Ajouter un destinataire</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input required autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl outline-none text-sm" style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', color: '#fff' }} placeholder="Nom Complet" />
          <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl outline-none text-sm" style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', color: '#fff' }} placeholder="Email (ex: dg@entreprise.dz)" />
          <button disabled={loading || !form.name || !form.email} className="w-full py-2.5 rounded-xl font-bold text-sm" style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.4)', color: '#0EA5E9' }}>
            {loading ? 'Enregistrement...' : 'Ajouter'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { addToast } = useEmergency();
  const [recipients, setRecipients] = useState<NotificationRecipientCA[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const reload = () => { setLoading(true); caGetNotifications().then(setRecipients).finally(() => setLoading(false)); };
  useEffect(reload, []);

  const handleAdd = async (data: { email: string, name: string }) => {
    try { await caAddNotification(data); addToast({ type: 'success', title: 'Destinataire ajouté', message: data.email }); reload(); }
    catch (e: any) { addToast({ type: 'error', title: 'Erreur', message: e.message }); throw e; }
  };

  const handleRemove = async (r: NotificationRecipientCA) => {
    if (!confirm(`Supprimer ${r.email} de la liste de diffusion ?`)) return;
    try { await caRemoveNotification(r.id); addToast({ type: 'info', title: 'Destinataire supprimé', message: r.email }); reload(); }
    catch (e: any) { addToast({ type: 'error', title: 'Erreur', message: e.message }); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>Notifications</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>Diffusion des alertes critiques (Entreprise)</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ background: '#0EA5E9' }}>
          <Plus className="w-4 h-4" /> Ajouter un email
        </button>
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#0EA5E9' }} />
        <p className="text-xs" style={{ color: '#7DD3FC' }}>
          Les destinataires ci-dessous recevront un email automatique pour toute <strong>nouvelle urgence</strong> déclenchée dans votre entreprise, ainsi qu'un rapport de résolution.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', boxShadow: 'var(--sos-shadow)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--sos-border)' }}>
              {['', 'Nom', 'Email', 'Ajouté le', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--sos-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--sos-text-muted)' }}>Chargement...</td></tr>
            ) : recipients.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--sos-text-muted)' }}>Aucun destinataire configuré.</td></tr>
            ) : recipients.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: i < recipients.length - 1 ? '1px solid var(--sos-border-subtle)' : undefined }}>
                <td className="px-4 py-3 w-12">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}>
                    <Mail className="w-4 h-4" />
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#0EA5E9' }}>{r.email}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--sos-text-muted)' }}>
                  {new Date(r.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleRemove(r)} title="Supprimer" className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-red-500/10 transition-colors" style={{ border: '1px solid var(--sos-border)' }}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showAdd && <AddRecipientModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      </AnimatePresence>
    </div>
  );
}
