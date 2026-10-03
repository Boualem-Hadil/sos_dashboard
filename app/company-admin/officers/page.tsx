'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ShieldCheck, X, Pencil, KeyRound, UserX, UserCheck, Eye, EyeOff } from 'lucide-react';
import { caGetOfficers, caDeactivateOfficer, caReactivateOfficer, caResetPassword, caUpdateOfficer } from '@/lib/company-admin-service';
import { useEmergency } from '@/context/EmergencyContext';
import { AddWorkerModal } from '@/components/workers/AddWorkerModal';
import type { OfficerUser } from '@/types';

const INPUT = {
  background: '#0D0D0D', border: '1px solid #2A2A2A', color: '#fff',
  borderRadius: '10px', padding: '10px 14px', width: '100%', fontSize: '14px', outline: 'none',
} as const;

// -- Edit Modal ----
function EditOfficerModal({ officer, onClose, onSaved }: { officer: OfficerUser; onClose: () => void; onSaved: (o: OfficerUser) => void }) {
  const { addToast } = useEmergency();
  const [form, setForm] = useState({ full_name: officer.full_name, phone: officer.phone || '', employee_id: officer.employee_id });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const updated = await caUpdateOfficer(officer.id, form);
      addToast({ type: 'success', title: '✓ Agent modifié', message: `${updated.full_name} a été mis à jour.` });
      onSaved(updated);
      onClose();
    } catch (err: any) { setError(err.message || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
        <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: '#111', border: '1px solid #222' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #1A1A1A' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)' }}>
                <Pencil className="w-4 h-4" style={{ color: '#0EA5E9' }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Modifier l&apos;agent</h2>
                <p className="text-xs" style={{ color: '#555' }}>{officer.employee_id}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: '#555' }} /></button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
            {[
              { label: 'Nom complet *', key: 'full_name', placeholder: '' },
              { label: 'ID Employé *', key: 'employee_id', placeholder: '' },
              { label: 'Téléphone', key: 'phone', placeholder: '+213 xxx xxx xxx' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold uppercase tracking-widest block mb-1.5" style={{ color: '#808080' }}>{f.label}</label>
                <input style={INPUT} value={(form as any)[f.key]} placeholder={f.placeholder}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
            {error && <div className="px-3 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>{error}</div>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#1A1A1A', color: '#808080', border: '1px solid #2A2A2A' }}>Annuler</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.4)', color: '#0EA5E9', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// -- Temp Password Modal ----
function TempPasswordModal({ name, password, onClose }: { name: string; password: string; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
        <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }}
          className="w-full max-w-sm mx-4 rounded-2xl p-6 shadow-2xl flex flex-col gap-5"
          style={{ background: '#111', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <KeyRound className="w-5 h-5" style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mot de passe provisoire</h2>
              <p className="text-xs" style={{ color: '#6B7280' }}>{name} doit le changer à la prochaine connexion</p>
            </div>
          </div>
          <div className="rounded-xl p-4 flex items-center justify-between gap-3" style={{ background: '#0D0D0D', border: '1px solid #2A2A2A' }}>
            <span className="font-mono text-sm font-bold" style={{ color: '#F59E0B', letterSpacing: '0.08em' }}>
              {visible ? password : '•'.repeat(password.length)}
            </span>
            <button onClick={() => setVisible(v => !v)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
              {visible ? <EyeOff className="w-3.5 h-3.5" style={{ color: '#6B7280' }} /> : <Eye className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />}
            </button>
          </div>
          <p className="text-xs" style={{ color: '#F59E0B' }}>⚠ Copiez ce mot de passe maintenant — il ne sera plus affiché.</p>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#F59E0B' }}>
            Compris, j&apos;ai copié le mot de passe
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// -- Main page ----
export default function OfficersPage() {
  const { addToast } = useEmergency();
  const [officers, setOfficers] = useState<OfficerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<OfficerUser | null>(null);
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    caGetOfficers(showInactive).then(setOfficers).finally(() => setLoading(false));
  }, [showInactive]);

  useEffect(() => { reload(); }, [reload]);

  const handleDeactivate = async (o: OfficerUser) => {
    if (!confirm(`Désactiver le compte de ${o.full_name} ?`)) return;
    try { await caDeactivateOfficer(o.id); addToast({ type: 'success', title: 'Agent désactivé', message: o.full_name }); reload(); }
    catch (e: any) { addToast({ type: 'error', title: 'Erreur', message: e.message }); }
  };

  const handleReactivate = async (o: OfficerUser) => {
    try { await caReactivateOfficer(o.id); addToast({ type: 'success', title: 'Agent réactivé', message: o.full_name }); reload(); }
    catch (e: any) { addToast({ type: 'error', title: 'Erreur', message: e.message }); }
  };

  const handleReset = async (o: OfficerUser) => {
    if (!confirm(`Réinitialiser le mot de passe de ${o.full_name} ? Un mot de passe provisoire sera généré.`)) return;
    try {
      const res = await caResetPassword(o.id);
      setTempPassword({ name: o.full_name, password: res.temp_password });
      addToast({ type: 'info', title: 'Mot de passe réinitialisé', message: o.full_name });
    } catch (e: any) { addToast({ type: 'error', title: 'Erreur', message: e.message }); }
  };

  const filtered = officers.filter(o => {
    const q = search.toLowerCase();
    return !q || o.full_name.toLowerCase().includes(q) || o.employee_id.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>Agents de sécurité</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>{officers.filter(o => o.is_active).length} actifs</p>
        </div>
        <button id="btn-add-officer" onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{ background: '#0EA5E9' }}>
          <Plus className="w-4 h-4" /> Nouvel agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sos-text-muted)' }} />
          <input type="text" placeholder="Nom ou ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }} />
        </div>
        <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm cursor-pointer select-none"
          style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-secondary)' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
          Inclure inactifs
        </label>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', boxShadow: 'var(--sos-shadow)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--sos-border)' }}>
              {['', 'Nom', 'ID Employé', 'Téléphone', 'Statut', 'Ajouté le', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--sos-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--sos-text-muted)' }}>Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--sos-text-muted)' }}>Aucun agent trouvé</td></tr>
            ) : filtered.map((o, i) => (
              <tr key={o.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--sos-border-subtle)' : undefined }}
                className="hover:bg-[var(--sos-bg-hover)] transition-colors">
                <td className="px-4 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: o.is_active ? 'rgba(14,165,233,0.2)' : '#222', border: o.is_active ? '1px solid rgba(14,165,233,0.4)' : '1px solid #333' }}>
                    <ShieldCheck className="w-4 h-4" style={{ color: o.is_active ? '#0EA5E9' : '#444' }} />
                  </div>
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: o.is_active ? 'var(--sos-text-primary)' : 'var(--sos-text-muted)' }}>{o.full_name}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--sos-text-muted)' }}>{o.employee_id}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--sos-text-secondary)' }}>{o.phone || '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-bold"
                    style={{ background: o.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.1)', color: o.is_active ? '#10B981' : '#6B7280', border: `1px solid ${o.is_active ? '#10B98130' : '#6B728030'}` }}>
                    {o.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--sos-text-muted)' }}>
                  {new Date(o.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditTarget(o)} title="Modifier" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/8 transition-colors" style={{ border: '1px solid var(--sos-border)' }}>
                      <Pencil className="w-3.5 h-3.5" style={{ color: '#0EA5E9' }} />
                    </button>
                    <button onClick={() => handleReset(o)} title="Réinitialiser MDP" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/8 transition-colors" style={{ border: '1px solid var(--sos-border)' }}>
                      <KeyRound className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} />
                    </button>
                    {o.is_active ? (
                      <button onClick={() => handleDeactivate(o)} title="Désactiver" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors" style={{ border: '1px solid var(--sos-border)' }}>
                        <UserX className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                      </button>
                    ) : (
                      <button onClick={() => handleReactivate(o)} title="Réactiver" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-green-500/10 transition-colors" style={{ border: '1px solid var(--sos-border)' }}>
                        <UserCheck className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showAddModal && <AddWorkerModal onClose={() => { setShowAddModal(false); reload(); }} />}
        {editTarget && <EditOfficerModal officer={editTarget} onClose={() => setEditTarget(null)} onSaved={(u) => { setOfficers(prev => prev.map(o => o.id === u.id ? u : o)); setEditTarget(null); }} />}
        {tempPassword && <TempPasswordModal name={tempPassword.name} password={tempPassword.password} onClose={() => setTempPassword(null)} />}
      </AnimatePresence>
    </div>
  );
}
