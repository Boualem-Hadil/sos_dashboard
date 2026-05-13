'use client';
import { useState } from 'react';
import { Building2, Bell, Users, Shield, Save } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { COMPANIES, SAFETY_OFFICERS } from '@/lib/mock-data';

export default function SettingsPage() {
  const company = COMPANIES[0];
  const [companyForm, setCompanyForm] = useState({ name: company.name, industry: company.industry, address: company.address });
  const [notifs, setNotifs] = useState({ sound: true, email: true, browser: true });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #222' }}>
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid #222' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(229,57,53,0.15)' }}>
          <Icon className="w-4 h-4" style={{ color: '#E53935' }} />
        </div>
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  const Field = ({ label, value, onChange, disabled }: { label: string; value: string; onChange?: (v: string) => void; disabled?: boolean }) => (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#808080' }}>{label}</label>
      <input value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: disabled ? '#0A0A0A' : '#1A1A1A', border: '1px solid #2A2A2A', color: disabled ? '#555' : '#fff' }} />
    </div>
  );

  const Toggle = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #1A1A1A' }}>
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs mt-0.5" style={{ color: '#808080' }}>{desc}</div>
      </div>
      <button onClick={() => onChange(!checked)} className="w-12 h-6 rounded-full relative transition-all"
        style={{ background: checked ? '#E53935' : '#333' }}>
        <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: checked ? '26px' : '4px' }} />
      </button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-black text-white">Paramètres</h1>
          <p className="text-sm mt-1" style={{ color: '#808080' }}>Configuration de la plateforme</p>
        </div>

        <Section icon={Building2} title="Informations Entreprise">
          <div className="flex flex-col gap-4">
            <Field label="Nom de l'entreprise" value={companyForm.name} onChange={v => setCompanyForm(f => ({ ...f, name: v }))} />
            <Field label="Secteur d'activité" value={companyForm.industry} onChange={v => setCompanyForm(f => ({ ...f, industry: v }))} />
            <Field label="Adresse" value={companyForm.address} onChange={v => setCompanyForm(f => ({ ...f, address: v }))} />
            <Field label="Code entreprise" value={company.code} disabled />
          </div>
        </Section>

        <Section icon={Bell} title="Préférences de Notification">
          <div>
            <Toggle label="Son d'alarme" desc="Jouer un son lors d'une urgence" checked={notifs.sound} onChange={v => setNotifs(f => ({ ...f, sound: v }))} />
            <Toggle label="Alertes email" desc="Envoyer un email aux responsables sécurité" checked={notifs.email} onChange={v => setNotifs(f => ({ ...f, email: v }))} />
            <Toggle label="Notifications navigateur" desc="Afficher une notification dans le navigateur" checked={notifs.browser} onChange={v => setNotifs(f => ({ ...f, browser: v }))} />
          </div>
        </Section>

        <Section icon={Users} title="Limite d'Utilisateurs">
          <div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="text-3xl font-black" style={{ color: '#4CAF50' }}>
                  {company.currentWorkers}<span className="text-xl font-normal" style={{ color: '#555' }}>/{company.maxWorkers}</span>
                </div>
                <div className="text-sm mt-1" style={{ color: '#808080' }}>travailleurs enregistrés</div>
              </div>
              <div className="text-right">
                <div className="text-sm" style={{ color: '#808080' }}>{company.maxWorkers - company.currentWorkers} postes disponibles</div>
              </div>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#1A1A1A' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(company.currentWorkers / company.maxWorkers) * 100}%`, background: 'linear-gradient(90deg, #4CAF50, #E53935)' }} />
            </div>
            <p className="text-xs mt-3 p-3 rounded-lg" style={{ background: '#1A1A1A', color: '#808080' }}>
              Pour augmenter votre limite, contactez notre équipe commerciale: <span style={{ color: '#E53935' }}>commercial@sos-algerie.dz</span>
            </p>
          </div>
        </Section>

        <Section icon={Shield} title="Officiers de Sécurité">
          <div className="flex flex-col gap-3">
            {SAFETY_OFFICERS.map(o => (
              <div key={o.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#1A1A1A' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ background: '#E53935' }}>
                    {o.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{o.name}</div>
                    <div className="text-xs" style={{ color: '#808080' }}>{o.role} — {o.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded" style={{ background: o.receivesAlerts ? 'rgba(76,175,80,0.15)' : '#1A1A1A', color: o.receivesAlerts ? '#4CAF50' : '#555', border: `1px solid ${o.receivesAlerts ? '#4CAF5040' : '#333'}` }}>
                    {o.receivesAlerts ? 'Alertes activées' : 'Alertes désactivées'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white self-start transition-all"
          style={{ background: saved ? '#4CAF50' : '#E53935', boxShadow: '0 4px 20px rgba(229,57,53,0.3)' }}>
          <Save className="w-4 h-4" /> {saved ? 'Sauvegardé ✓' : 'Sauvegarder les modifications'}
        </button>
      </div>
    </DashboardLayout>
  );
}
