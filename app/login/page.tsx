'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login, saveAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ employeeId: '', password: '', companyCode: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const user = await login(form.employeeId, form.password, form.companyCode);
    if (!user) {
      setError('Identifiants incorrects ou code entreprise invalide.');
      setLoading(false);
      return;
    }
    try {
      saveAuth(user);
      // Hard redirect to force EmergencyContext to remount and load fresh data
      window.location.href = user.role === 'super_admin' ? '/admin' : '/';
    } catch (err) {
      console.error('Failed to save auth to localStorage:', err);
      setError('Erreur du navigateur: Impossible de sauvegarder la session. Vérifiez vos paramètres de cookies.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-200" style={{ background: 'var(--sos-bg-base)' }}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(229,57,53,0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(229,57,53,0.15) 0%, transparent 50%)' }} />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl p-8 shadow-2xl border" style={{ background: 'var(--sos-bg-surface)', borderColor: 'var(--sos-border)' }}>
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #E53935, #B71C1C)', boxShadow: '0 8px 30px rgba(229,57,53,0.3)' }}>
              <ShieldAlert className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: '#E53935' }}>SOS Algérie</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>Plateforme de sécurité surveillance</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Employee ID */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--sos-text-secondary)' }}>ID Employé</label>
              <input
                id="employeeId"
                type="text"
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                placeholder="ex: SN-001"
                required
                className="w-full px-4 py-3 rounded-xl outline-none transition-all"
                style={{ background: 'var(--sos-bg-surface-2)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }}
                onFocus={e => e.target.style.borderColor = '#E53935'}
                onBlur={e => e.target.style.borderColor = 'var(--sos-border)'}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--sos-text-secondary)' }}>Mot de passe</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl outline-none transition-all"
                  style={{ background: 'var(--sos-bg-surface-2)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }}
                  onFocus={e => e.target.style.borderColor = '#E53935'}
                  onBlur={e => e.target.style.borderColor = 'var(--sos-border)'}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sos-text-muted)' }}>
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Company Code */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--sos-text-secondary)' }}>Code Entreprise</label>
              <input
                id="companyCode"
                type="text"
                value={form.companyCode}
                onChange={e => setForm(f => ({ ...f, companyCode: e.target.value.toUpperCase() }))}
                placeholder="ex: SONATRACH-2024, COSIDER-2024..."
                required
                className="w-full px-4 py-3 rounded-xl outline-none transition-all font-mono"
                style={{ background: 'var(--sos-bg-surface-2)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }}
                onFocus={e => e.target.style.borderColor = '#E53935'}
                onBlur={e => e.target.style.borderColor = 'var(--sos-border)'}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--sos-text-muted)' }}>Codes: SNTR · CVTL · ARCL · SUPER-ADMIN</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)', color: '#EF5350' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              id="loginSubmit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-base transition-all mt-2"
              style={{ background: loading ? 'var(--sos-border)' : 'linear-gradient(135deg, #E53935, #B71C1C)', color: loading ? 'var(--sos-text-muted)' : '#fff', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(229,57,53,0.3)' }}
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 pt-6 flex items-center justify-center gap-2" style={{ borderTop: '1px solid var(--sos-border)' }}>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs" style={{ color: 'var(--sos-text-muted)' }}>Système opérationnel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
