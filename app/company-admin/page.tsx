'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, Layers, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { caGetOverview } from '@/lib/company-admin-service';
import type { CompanyAdminStats } from '@/types';
import { getAuth } from '@/lib/auth';

const CARDS = (s: CompanyAdminStats) => [
  {
    label: 'Agents de sécurité',
    value: s.total_officers,
    icon: ShieldCheck,
    color: '#0EA5E9',
    bg: 'rgba(14,165,233,0.1)',
    border: 'rgba(14,165,233,0.25)',
    sub: 'Actifs dans votre entreprise',
  },
  {
    label: 'Travailleurs',
    value: s.total_workers,
    icon: Users,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.25)',
    sub: 'Inscrits et actifs',
  },
  {
    label: 'Départements',
    value: s.total_departments,
    icon: Layers,
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.1)',
    border: 'rgba(167,139,250,0.25)',
    sub: 'Unités organisationnelles',
  },
  {
    label: 'Urgences ouvertes',
    value: s.month_emergencies_open,
    icon: AlertCircle,
    color: s.month_emergencies_open > 0 ? '#EF4444' : '#6B7280',
    bg: s.month_emergencies_open > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.07)',
    border: s.month_emergencies_open > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(107,114,128,0.15)',
    sub: 'Ce mois-ci — en cours',
    pulse: s.month_emergencies_open > 0,
  },
  {
    label: 'Urgences résolues',
    value: s.month_emergencies_resolved,
    icon: CheckCircle2,
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.25)',
    sub: 'Ce mois-ci',
  },
  {
    label: 'Temps de réponse moy.',
    value: s.avg_response_minutes != null ? `${s.avg_response_minutes} min` : '—',
    icon: Clock,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.25)',
    sub: 'Urgences résolues ce mois',
  },
];

export default function CompanyAdminOverviewPage() {
  const [stats, setStats] = useState<CompanyAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    caGetOverview().then(setStats).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>
          Vue d&apos;ensemble
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>
          Gestion de votre entreprise — {auth?.companyName || ''}
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
        <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: '#0EA5E9' }} />
        <p className="text-xs" style={{ color: '#7DD3FC' }}>
          Ce tableau de bord affiche des <strong>chiffres agrégés</strong> de votre entreprise. La surveillance en temps réel des urgences est réservée aux agents de sécurité.
        </p>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', height: 120 }} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CARDS(stats).map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl p-5 flex flex-col gap-3"
              style={{ background: 'var(--sos-bg-surface)', border: `1px solid ${c.border}`, boxShadow: 'var(--sos-shadow)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--sos-text-muted)' }}>
                  {c.label}
                </span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c.bg }}>
                  <c.icon className="w-4 h-4" style={{ color: c.color, ...(c.pulse ? { animation: 'badge-pulse 1.2s infinite' } : {}) }} />
                </div>
              </div>
              <div className="text-3xl font-black" style={{ color: c.color }}>{c.value}</div>
              <div className="text-xs" style={{ color: 'var(--sos-text-muted)' }}>{c.sub}</div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-sm" style={{ color: 'var(--sos-text-muted)' }}>Erreur de chargement</div>
      )}
    </div>
  );
}
