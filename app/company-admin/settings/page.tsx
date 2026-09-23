'use client';
import { useState, useEffect } from 'react';
import { Settings, Building, Phone, Mail, Hash, AlertTriangle } from 'lucide-react';
import { caGetSettings, caUpdateSettings } from '@/lib/company-admin-service';
import { useEmergency } from '@/context/EmergencyContext';

const INPUT = {
  background: '#0D0D0D', border: '1px solid #2A2A2A', color: '#fff',
  borderRadius: '10px', padding: '10px 14px', width: '100%', fontSize: '14px', outline: 'none',
} as const;

export default function SettingsPage() {
  const { addToast } = useEmergency();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', industry: '', contact_email: '', sos_hotline_phone: '' });

  useEffect(() => {
    caGetSettings().then(res => {
      setSettings(res);
      setForm({ name: res.name, industry: res.industry, contact_email: res.contact_email || '', sos_hotline_phone: res.sos_hotline_phone || '' });
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setSaving(true);
    try {
      const updated = await caUpdateSettings(form);
      setSettings(updated);
      addToast({ type: 'success', title: 'Sauvegardé', message: 'Paramètres mis à jour.' });
    } catch (err: any) { addToast({ type: 'error', title: 'Erreur', message: err.message }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-gray-500">Chargement...</div>;
  if (!settings) return <div className="text-red-500">Erreur de chargement des paramètres</div>;

  const pct = Math.round((settings.current_users / settings.max_users) * 100);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>Paramètres</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>Profil et facturation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 rounded-xl p-6" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)' }}>
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Building className="w-5 h-5 text-sky-500" /> Profil de l&apos;entreprise</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest block mb-1.5" style={{ color: '#808080' }}>Nom de l&apos;entreprise</label>
                <input required style={INPUT} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest block mb-1.5" style={{ color: '#808080' }}>Secteur d&apos;activité</label>
                <input required style={INPUT} value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest block mb-1.5" style={{ color: '#808080' }}>Email de contact</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input style={{ ...INPUT, paddingLeft: 36 }} value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest block mb-1.5" style={{ color: '#808080' }}>Hotline SOS Interne</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input style={{ ...INPUT, paddingLeft: 36 }} value={form.sos_hotline_phone} onChange={e => setForm(f => ({ ...f, sos_hotline_phone: e.target.value }))} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Numéro affiché aux travailleurs en cas d&apos;échec réseau.</p>
              </div>
            </div>
            
            <div className="pt-4 border-t" style={{ borderColor: 'var(--sos-border-subtle)' }}>
              <button disabled={saving} className="px-6 py-2.5 rounded-xl font-bold text-white disabled:opacity-50 transition-opacity" style={{ background: '#0EA5E9' }}>
                {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>

        {/* Capacity & Info */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl p-5" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)' }}>
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest text-center">Capacité (Licences)</h3>
            <div className="relative h-4 rounded-full overflow-hidden bg-gray-900 mb-2">
              <div className="absolute left-0 top-0 bottom-0 transition-all duration-1000" style={{ width: `${Math.min(100, pct)}%`, background: pct > 90 ? '#EF4444' : pct > 75 ? '#F59E0B' : '#10B981' }} />
            </div>
            <div className="flex justify-between text-xs font-mono mb-4">
              <span className="text-gray-400">{settings.current_users} utilisés</span>
              <span className="font-bold text-white">{settings.max_users} max</span>
            </div>
            {pct >= 90 && (
              <div className="flex gap-2 p-3 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Vous avez presque atteint la limite de votre licence. Contactez le support pour l&apos;augmenter.
              </div>
            )}
          </div>

          <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)' }}>
            <h3 className="text-sm font-bold text-gray-400 mb-2">Informations Système</h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Code Entreprise</span>
              <span className="font-mono font-bold text-sky-400 px-2 py-1 bg-sky-500/10 rounded">{settings.company_code}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-gray-500">Expiration</span>
              <span className="font-mono text-gray-300">{settings.subscription_end || 'Illimitée'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
