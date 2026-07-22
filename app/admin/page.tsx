'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, ShieldCheck, Bell, Plus, Pencil, Trash2,
  X, ChevronRight, AlertTriangle, CheckCircle, Clock, Users, Activity,
  RefreshCw, Eye, EyeOff, Mail, UserPlus, Shield, LogOut, Sun, Moon,
} from 'lucide-react';
import { getAuth, logout, getToken } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';
import {
  getAdminStatsApi, getAdminCompaniesApi, createAdminCompanyApi, updateAdminCompanyApi,
  getAdminOfficersApi, createAdminOfficerApi, deactivateAdminOfficerApi,
  getNotificationRecipientsApi, addNotificationRecipientApi, removeNotificationRecipientApi,
  getExpiringCompaniesApi,
} from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminStats {
  total_companies: number;
  total_users: number;
  total_emergencies_today: number;
  active_emergencies: number;
  expiring_soon: number;
  expired: number;
}

interface Company {
  id: string;
  name: string;
  industry: string;
  company_code: string;
  contact_email: string | null;
  max_users: number;
  current_users: number;
  subscription_start: string | null;
  subscription_end: string | null;
  is_active: boolean;
  created_at: string;
  active_emergencies?: number;
  total_emergencies?: number;
}

interface Officer {
  id: string;
  full_name: string;
  employee_id: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  company_id: string;
  created_at: string;
  last_seen: string | null;
}

interface NotifRecipient {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function licenseStatus(company: Company): 'ok' | 'expiring' | 'critical' | 'expired' {
  const days = daysUntil(company.subscription_end);
  if (days === null) return 'ok';
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'expiring';
  return 'ok';
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

const INDUSTRIES = ['oil', 'construction', 'mining', 'factory', 'chemical', 'transport', 'energy', 'other'];

// ─── Small reusable input ─────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--sos-text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px', outline: 'none',
  background: 'var(--sos-bg-surface-2)', border: '1px solid var(--sos-border)',
  color: 'var(--sos-text-primary)', fontSize: '14px', transition: 'border-color 0.15s',
};

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--sos-border)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--sos-text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity" style={{ background: 'var(--sos-bg-hover)' }}>
            <X className="w-4 h-4" style={{ color: 'var(--sos-text-muted)' }} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Stats Cards ─────────────────────────────────────────────────────────────

function StatsGrid({ stats }: { stats: AdminStats }) {
  const cards = [
    { label: 'Entreprises', value: stats.total_companies, icon: Building2, color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Utilisateurs', value: stats.total_users, icon: Users, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Urgences Actives', value: stats.active_emergencies, icon: Activity, color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    { label: 'Urgences Aujourd\'hui', value: stats.total_emergencies_today, icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Licences Expirant', value: stats.expiring_soon, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Licences Expirées', value: stats.expired, icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="rounded-xl p-5 flex items-center gap-4" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <div className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>{value}</div>
            <div className="text-xs font-medium" style={{ color: 'var(--sos-text-muted)' }}>{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Companies Table ──────────────────────────────────────────────────────────

function CompaniesTab({ token, onToast }: { token: string; onToast: (m: string, t?: 'ok' | 'err') => void }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAdminCompaniesApi(token);
      setCompanies(r.data || []);
    } catch { onToast('Erreur chargement entreprises', 'err'); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const statusBadge = (c: Company) => {
    const st = licenseStatus(c);
    const days = daysUntil(c.subscription_end);
    const map = {
      ok:       { label: 'Active', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
      expiring: { label: `${days}j restants`, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
      critical: { label: `🚨 ${days}j!`, color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
      expired:  { label: 'Expirée', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
    };
    const b = map[st];
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: b.color, background: b.bg }}>
        {!c.is_active ? '⛔ Désactivée' : b.label}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg" style={{ color: 'var(--sos-text-primary)' }}>Entreprises ({companies.length})</h2>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-secondary)' }}>
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
            <Plus className="w-3.5 h-3.5" /> Nouvelle Entreprise
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sos-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--sos-bg-surface-2)', borderBottom: '1px solid var(--sos-border)' }}>
              {['Entreprise', 'Code', 'Secteur', 'Travailleurs', 'Licence', 'Email Contact', 'Statut', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--sos-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10" style={{ color: 'var(--sos-text-muted)' }}>Chargement…</td></tr>
            ) : companies.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10" style={{ color: 'var(--sos-text-muted)' }}>Aucune entreprise</td></tr>
            ) : companies.map(c => (
              <tr key={c.id} className="transition-colors" style={{ borderBottom: '1px solid var(--sos-border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--sos-bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--sos-text-primary)' }}>{c.name}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--sos-text-secondary)' }}>{c.company_code}</td>
                <td className="px-4 py-3" style={{ color: 'var(--sos-text-secondary)', textTransform: 'capitalize' }}>{c.industry}</td>
                <td className="px-4 py-3">
                  <span style={{ color: 'var(--sos-text-primary)' }}>{c.current_users}</span>
                  <span style={{ color: 'var(--sos-text-muted)' }}>/{c.max_users}</span>
                  <div className="mt-1 h-1.5 rounded-full" style={{ background: 'var(--sos-border)', width: '60px' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (c.current_users / c.max_users) * 100)}%`, background: c.current_users >= c.max_users ? '#EF4444' : '#6366F1' }} />
                  </div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--sos-text-muted)' }}>
                  {fmtDate(c.subscription_end)}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--sos-text-muted)' }}>{c.contact_email || '—'}</td>
                <td className="px-4 py-3">{statusBadge(c)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setEditTarget(c)} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: '#6366F1' }} title="Modifier">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CompanyModal
          token={token}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); onToast('Entreprise créée ✓', 'ok'); }}
          onToast={onToast}
        />
      )}
      {editTarget && (
        <CompanyModal
          token={token}
          company={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load(); onToast('Entreprise mise à jour ✓', 'ok'); }}
          onToast={onToast}
        />
      )}
    </div>
  );
}

// ─── Company Create/Edit Modal ────────────────────────────────────────────────

function CompanyModal({ token, company, onClose, onSaved, onToast }: {
  token: string; company?: Company;
  onClose: () => void; onSaved: () => void;
  onToast: (m: string, t?: 'ok' | 'err') => void;
}) {
  const editing = !!company;
  const [form, setForm] = useState({
    name: company?.name ?? '',
    industry: company?.industry ?? 'oil',
    company_code: company?.company_code ?? '',
    max_users: company?.max_users ?? 50,
    contact_email: company?.contact_email ?? '',
    subscription_start: company?.subscription_start?.slice(0, 10) ?? '',
    subscription_end: company?.subscription_end?.slice(0, 10) ?? '',
    is_active: company?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload: any = {
        name: form.name,
        industry: form.industry,
        max_users: Number(form.max_users),
        contact_email: form.contact_email || undefined,
        subscription_start: form.subscription_start || undefined,
        subscription_end: form.subscription_end || undefined,
        is_active: form.is_active,
      };
      if (editing) {
        await updateAdminCompanyApi(company!.id, payload, token);
      } else {
        payload.company_code = form.company_code.toUpperCase();
        await createAdminCompanyApi(payload, token);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    }
    setSaving(false);
  };

  return (
    <Modal title={editing ? `Modifier — ${company!.name}` : 'Nouvelle Entreprise'} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nom de l'entreprise">
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Sonatrach Division Exploitation" />
        </Field>
        {!editing && (
          <Field label="Code unique">
            <input style={inputStyle} value={form.company_code} onChange={e => set('company_code', e.target.value.toUpperCase())} required placeholder="SONATRACH-2024" className="font-mono" />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Secteur">
            <select style={inputStyle} value={form.industry} onChange={e => set('industry', e.target.value)}>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Max travailleurs">
            <input style={inputStyle} type="number" min={1} value={form.max_users} onChange={e => set('max_users', e.target.value)} required />
          </Field>
        </div>
        <Field label="Email de contact (notifications licence)">
          <input style={inputStyle} type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="contact@entreprise.dz" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début abonnement">
            <input style={inputStyle} type="date" value={form.subscription_start} onChange={e => set('subscription_start', e.target.value)} />
          </Field>
          <Field label="Fin abonnement">
            <input style={inputStyle} type="date" value={form.subscription_end} onChange={e => set('subscription_end', e.target.value)} />
          </Field>
        </div>
        {editing && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              className="relative w-10 h-6 rounded-full transition-colors"
              style={{ background: form.is_active ? '#10B981' : 'var(--sos-border)' }}
              onClick={() => set('is_active', !form.is_active)}
            >
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: form.is_active ? 'translateX(16px)' : 'none' }} />
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--sos-text-secondary)' }}>
              {form.is_active ? 'Entreprise active' : 'Entreprise désactivée'}
            </span>
          </label>
        )}
        {error && <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--sos-bg-surface-2)', color: 'var(--sos-text-secondary)', border: '1px solid var(--sos-border)' }}>
            Annuler
          </button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: saving ? 'var(--sos-border)' : 'linear-gradient(135deg,#6366F1,#4F46E5)', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Officers Panel ───────────────────────────────────────────────────────────

function OfficersTab({ token, onToast }: { token: string; onToast: (m: string, t?: 'ok' | 'err') => void }) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, c] = await Promise.all([
        getAdminOfficersApi(token),
        getAdminCompaniesApi(token),
      ]);
      setOfficers(o.data || []);
      setCompanies(c.data || []);
    } catch { onToast('Erreur chargement agents', 'err'); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const deactivate = async (id: string, name: string) => {
    if (!confirm(`Désactiver le compte de ${name} ?`)) return;
    try {
      await deactivateAdminOfficerApi(id, token);
      onToast(`${name} désactivé ✓`, 'ok');
      load();
    } catch (err: any) { onToast(err.message || 'Erreur', 'err'); }
  };

  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? '—';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg" style={{ color: 'var(--sos-text-primary)' }}>Agents de Sécurité ({officers.length})</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
          <UserPlus className="w-3.5 h-3.5" /> Nouvel Agent
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sos-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--sos-bg-surface-2)', borderBottom: '1px solid var(--sos-border)' }}>
              {['Nom', 'ID Employé', 'Rôle', 'Entreprise', 'Téléphone', 'Créé le', 'Statut', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--sos-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10" style={{ color: 'var(--sos-text-muted)' }}>Chargement…</td></tr>
            ) : officers.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10" style={{ color: 'var(--sos-text-muted)' }}>Aucun agent</td></tr>
            ) : officers.map(o => (
              <tr key={o.id} className="transition-colors" style={{ borderBottom: '1px solid var(--sos-border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--sos-bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--sos-text-primary)' }}>{o.full_name}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--sos-text-secondary)' }}>{o.employee_id}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366F1' }}>
                    {o.role === 'safety_officer' ? 'Agent Sécurité' : o.role === 'company_admin' ? 'Admin Entreprise' : o.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--sos-text-secondary)' }}>{companyName(o.company_id)}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--sos-text-muted)' }}>{o.phone || '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--sos-text-muted)' }}>{fmtDate(o.created_at)}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={o.is_active ? { background: 'rgba(16,185,129,0.12)', color: '#10B981' } : { background: 'rgba(100,116,139,0.12)', color: '#64748B' }}>
                    {o.is_active ? 'Actif' : 'Désactivé'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {o.is_active && (
                    <button onClick={() => deactivate(o.id, o.full_name)} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: '#EF4444' }} title="Désactiver">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <OfficerModal
          token={token}
          companies={companies}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); onToast('Agent créé ✓', 'ok'); }}
          onToast={onToast}
        />
      )}
    </div>
  );
}

// ─── Officer Create Modal ─────────────────────────────────────────────────────

function OfficerModal({ token, companies, onClose, onSaved, onToast }: {
  token: string; companies: Company[];
  onClose: () => void; onSaved: () => void;
  onToast: (m: string, t?: 'ok' | 'err') => void;
}) {
  const [form, setForm] = useState({ full_name: '', employee_id: '', password: '', phone: '', company_id: companies[0]?.id ?? '' });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await createAdminOfficerApi({ ...form, phone: form.phone || undefined }, token);
      onSaved();
    } catch (err: any) { setError(err.message || 'Erreur'); }
    setSaving(false);
  };

  return (
    <Modal title="Créer un Agent de Sécurité" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nom complet">
          <input style={inputStyle} value={form.full_name} onChange={e => set('full_name', e.target.value)} required placeholder="Karim Boualem" />
        </Field>
        <Field label="Entreprise">
          <select style={inputStyle} value={form.company_id} onChange={e => set('company_id', e.target.value)} required>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company_code})</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ID Employé">
            <input style={inputStyle} value={form.employee_id} onChange={e => set('employee_id', e.target.value)} required placeholder="SON-001" />
          </Field>
          <Field label="Téléphone">
            <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+213550..." />
          </Field>
        </div>
        <Field label="Mot de passe">
          <div className="relative">
            <input style={inputStyle} type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sos-text-muted)' }}>
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
        {error && <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--sos-bg-surface-2)', color: 'var(--sos-text-secondary)', border: '1px solid var(--sos-border)' }}>Annuler</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: saving ? 'var(--sos-border)' : 'linear-gradient(135deg,#10B981,#059669)', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Création…' : 'Créer Agent'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── License Panel ────────────────────────────────────────────────────────────

function LicenseTab({ token, onToast }: { token: string; onToast: (m: string, t?: 'ok' | 'err') => void }) {
  const [expiring, setExpiring] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [days, setDays] = useState(90);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getExpiringCompaniesApi(token, days);
      setExpiring(r.data || []);
    } catch { onToast('Erreur chargement licences', 'err'); }
    setLoading(false);
  }, [token, days]);

  useEffect(() => { load(); }, [load]);

  const urgencyStyle = (c: Company) => {
    const st = licenseStatus(c);
    if (st === 'expired')  return { border: '1px solid rgba(239,68,68,0.4)',  background: 'rgba(239,68,68,0.06)' };
    if (st === 'critical') return { border: '1px solid rgba(239,68,68,0.3)',  background: 'rgba(239,68,68,0.04)' };
    if (st === 'expiring') return { border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' };
    return { border: '1px solid var(--sos-border)', background: 'var(--sos-bg-surface)' };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg" style={{ color: 'var(--sos-text-primary)' }}>Gestion des Licences</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--sos-text-muted)' }}>Afficher les</span>
          {[30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={days === d ? { background: '#6366F1', color: '#fff' } : { background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-secondary)' }}>
              {d}j
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center py-10" style={{ color: 'var(--sos-text-muted)' }}>Chargement…</p>
      ) : expiring.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)' }}>
          <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#10B981' }} />
          <p className="font-semibold" style={{ color: 'var(--sos-text-primary)' }}>Toutes les licences sont à jour</p>
          <p className="text-sm mt-1" style={{ color: 'var(--sos-text-muted)' }}>Aucune licence n'expire dans les {days} prochains jours.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {expiring.map(c => {
            const d = daysUntil(c.subscription_end);
            const st = licenseStatus(c);
            return (
              <div key={c.id} className="rounded-xl p-5 flex items-center justify-between gap-4" style={urgencyStyle(c)}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: st === 'ok' ? 'rgba(16,185,129,0.12)' : st === 'expired' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)' }}>
                    {st === 'expired' ? <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} /> :
                      st === 'critical' ? <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} /> :
                        <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--sos-text-primary)' }}>{c.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--sos-text-muted)' }}>
                      {c.company_code} · {c.current_users}/{c.max_users} travailleurs
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs font-semibold" style={{ color: st === 'expired' ? '#EF4444' : st === 'critical' ? '#EF4444' : '#F59E0B' }}>
                      {st === 'expired' ? `Expirée il y a ${Math.abs(d!)} jours` :
                        d === 0 ? 'Expire aujourd\'hui!' :
                          `Expire dans ${d} jour${d! > 1 ? 's' : ''}`}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--sos-text-muted)' }}>
                      {fmtDate(c.subscription_end)}
                    </div>
                  </div>
                  <button onClick={() => setEditTarget(c)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#6366F1', color: '#fff' }}>
                    <RefreshCw className="w-3 h-3" /> Renouveler
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editTarget && (
        <CompanyModal
          token={token}
          company={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load(); onToast('Licence renouvelée ✓', 'ok'); }}
          onToast={onToast}
        />
      )}
    </div>
  );
}

// ─── Notification Recipients Panel ───────────────────────────────────────────

function NotifTab({ token, onToast }: { token: string; onToast: (m: string, t?: 'ok' | 'err') => void }) {
  const [recipients, setRecipients] = useState<NotifRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', name: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getNotificationRecipientsApi(token);
      setRecipients((r.data || []).filter((r: NotifRecipient) => r.is_active));
    } catch { onToast('Erreur chargement destinataires', 'err'); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await addNotificationRecipientApi(form, token);
      setForm({ email: '', name: '' });
      load();
      onToast('Destinataire ajouté ✓', 'ok');
    } catch (err: any) { onToast(err.message || 'Erreur', 'err'); }
    setAdding(false);
  };

  const remove = async (id: string, email: string) => {
    if (!confirm(`Retirer ${email} des notifications ?`)) return;
    try {
      await removeNotificationRecipientApi(id, token);
      load();
      onToast('Retiré ✓', 'ok');
    } catch (err: any) { onToast(err.message || 'Erreur', 'err'); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-lg mb-1" style={{ color: 'var(--sos-text-primary)' }}>Destinataires des Notifications</h2>
        <p className="text-sm" style={{ color: 'var(--sos-text-muted)' }}>
          Ces adresses reçoivent les alertes d'expiration de licence en plus de votre email admin.
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={add} className="rounded-xl p-5 flex flex-col gap-3" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)' }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--sos-text-muted)' }}>Ajouter un destinataire</p>
        <div className="flex gap-3">
          <input style={{ ...inputStyle, flex: 1 }} type="text" placeholder="Nom complet" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <input style={{ ...inputStyle, flex: 2 }} type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <button type="submit" disabled={adding} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0"
            style={{ background: adding ? 'var(--sos-border)' : 'linear-gradient(135deg,#6366F1,#4F46E5)', cursor: adding ? 'not-allowed' : 'pointer' }}>
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </form>

      {/* List */}
      <div className="flex flex-col gap-2">
        {loading ? (
          <p className="text-center py-6" style={{ color: 'var(--sos-text-muted)' }}>Chargement…</p>
        ) : recipients.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)' }}>
            <Mail className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--sos-text-muted)' }} />
            <p style={{ color: 'var(--sos-text-muted)' }}>Aucun destinataire configuré</p>
          </div>
        ) : recipients.map(r => (
          <div key={r.id} className="flex items-center justify-between px-5 py-3.5 rounded-xl" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
                {r.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--sos-text-primary)' }}>{r.name}</div>
                <div className="text-xs" style={{ color: 'var(--sos-text-muted)' }}>{r.email}</div>
              </div>
            </div>
            <button onClick={() => remove(r.id, r.email)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#EF4444' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

type Tab = 'overview' | 'companies' | 'officers' | 'licenses' | 'notifications';

export default function AdminPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const auth = getAuth();
    const tok = getToken();
    if (!auth || auth.role !== 'super_admin') {
      router.replace('/');
      return;
    }
    setToken(tok);
  }, [router]);

  const loadStats = useCallback(async (tok: string) => {
    try {
      const r = await getAdminStatsApi(tok);
      setStats(r.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (token) loadStats(token);
  }, [token, loadStats]);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  if (!mounted || !token) return null;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview',       label: 'Vue d\'ensemble',  icon: LayoutDashboard },
    { id: 'companies',      label: 'Entreprises',       icon: Building2 },
    { id: 'officers',       label: 'Agents',            icon: ShieldCheck },
    { id: 'licenses',       label: 'Licences',          icon: Clock },
    { id: 'notifications',  label: 'Notifications',     icon: Bell },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--sos-bg-base)' }}>
      {/* Top bar */}
      <header className="h-16 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30"
        style={{ background: 'var(--sos-bg-surface)', borderBottom: '1px solid var(--sos-border)', boxShadow: 'var(--sos-shadow)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: 'var(--sos-text-primary)' }}>Super Admin Panel</div>
            <div className="text-xs" style={{ color: 'var(--sos-text-muted)' }}>SOS Algérie Platform</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--sos-bg-hover)', border: '1px solid var(--sos-border)' }}>
            {theme === 'dark' ? <Sun className="w-4 h-4" style={{ color: 'var(--sos-warning)' }} /> : <Moon className="w-4 h-4" style={{ color: 'var(--sos-text-secondary)' }} />}
          </button>
          <button onClick={() => { logout(); router.push('/login'); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: 'var(--sos-sidebar-bg)', borderRight: '1px solid var(--sos-sidebar-border)' }}>
          <nav className="flex-1 py-4 px-3">
            <div className="text-xs font-semibold uppercase tracking-widest px-2 mb-3" style={{ color: 'var(--sos-sidebar-text)', opacity: 0.6 }}>
              Administration
            </div>
            <ul className="flex flex-col gap-0.5">
              {tabs.map(({ id, label, icon: Icon }) => {
                const active = tab === id;
                return (
                  <li key={id}>
                    <button onClick={() => setTab(id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                      style={active ? { background: 'rgba(99,102,241,0.15)', color: '#818CF8', borderLeft: '2px solid #6366F1', paddingLeft: '10px' }
                        : { color: 'var(--sos-sidebar-text)', borderLeft: '2px solid transparent' }}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--sos-sidebar-border)' }}>
            <button onClick={() => router.push('/')} className="flex items-center gap-2 text-xs w-full" style={{ color: 'var(--sos-sidebar-text)' }}>
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              Retour dashboard
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {tab === 'overview' && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>Vue d'ensemble</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>Statistiques globales de la plateforme SOS Algérie</p>
              </div>
              {stats ? <StatsGrid stats={stats} /> : (
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl p-5 h-24 animate-pulse" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)' }} />
                  ))}
                </div>
              )}
              {/* Quick actions */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Nouvelle Entreprise', icon: Plus, color: '#6366F1', tab: 'companies' as Tab },
                  { label: 'Nouvel Agent', icon: UserPlus, color: '#10B981', tab: 'officers' as Tab },
                  { label: 'Vérifier Licences', icon: Clock, color: '#F59E0B', tab: 'licenses' as Tab },
                  { label: 'Notifications', icon: Bell, color: '#6366F1', tab: 'notifications' as Tab },
                ].map(({ label, icon: Icon, color, tab: t }) => (
                  <button key={label} onClick={() => setTab(t)} className="rounded-xl p-4 text-left flex items-center gap-3 transition-all hover:scale-[1.02]"
                    style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)' }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--sos-text-primary)' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {tab === 'companies'     && <CompaniesTab     token={token} onToast={showToast} />}
          {tab === 'officers'      && <OfficersTab      token={token} onToast={showToast} />}
          {tab === 'licenses'      && <LicenseTab       token={token} onToast={showToast} />}
          {tab === 'notifications' && <NotifTab         token={token} onToast={showToast} />}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold text-white z-50"
          style={{ background: toast.type === 'ok' ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)', backdropFilter: 'blur(8px)', border: `1px solid ${toast.type === 'ok' ? '#10B981' : '#EF4444'}` }}>
          {toast.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
