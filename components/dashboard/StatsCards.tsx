'use client';
import { Users, Zap, AlertTriangle, Calendar } from 'lucide-react';
import { useEmergency } from '@/context/EmergencyContext';

export function StatsCards() {
  const { workers, liveCount, emergencyHistory, company, isLoading } = useEmergency();

  if (isLoading || !company) return null;

  const activeWorkers = workers.filter(w => w.status === 'active').length;
  const thisMonth = emergencyHistory.filter(e => {
    const d = new Date(e.startedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const cards = [
    {
      label: 'Total Travailleurs',
      value: `${company.currentWorkers}/${company.maxWorkers}`,
      icon: Users,
      color: 'var(--sos-success)',
      muted: 'var(--sos-success-muted)',
      border: 'rgba(16,185,129,0.20)',
      sub: `${company.maxWorkers - company.currentWorkers} postes disponibles`,
    },
    {
      label: 'Actifs maintenant',
      value: activeWorkers,
      icon: Zap,
      color: 'var(--sos-info)',
      muted: 'var(--sos-info-muted)',
      border: 'rgba(59,130,246,0.20)',
      sub: 'En service actuellement',
    },
    {
      label: 'Urgences en direct',
      value: liveCount,
      icon: AlertTriangle,
      color: 'var(--sos-accent)',
      muted: liveCount > 0 ? 'var(--sos-accent-muted)' : 'transparent',
      border: liveCount > 0 ? 'var(--sos-accent-border)' : 'var(--sos-border)',
      sub: liveCount > 0 ? '⚠ Intervention requise' : 'Aucune urgence active',
      pulse: liveCount > 0,
    },
    {
      label: 'Incidents ce mois',
      value: thisMonth,
      icon: Calendar,
      color: 'var(--sos-text-secondary)',
      muted: 'var(--sos-bg-hover)',
      border: 'var(--sos-border)',
      sub: 'Mois en cours',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div
          key={i}
          className="rounded-xl p-5 flex flex-col gap-3 transition-shadow"
          style={{
            background: 'var(--sos-bg-surface)',
            border: `1px solid ${c.border}`,
            boxShadow: 'var(--sos-shadow)',
            animation: c.pulse ? 'emergency-pulse 1.5s ease-in-out infinite' : undefined,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--sos-text-muted)' }}>
              {c.label}
            </span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: c.muted }}
            >
              <c.icon className="w-4 h-4" style={{ color: c.color }} />
            </div>
          </div>
          <div className="text-3xl font-black" style={{ color: c.color }}>{c.value}</div>
          <div className="text-xs" style={{ color: 'var(--sos-text-muted)' }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
