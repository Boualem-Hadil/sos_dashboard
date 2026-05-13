'use client';
import { Users, Zap, AlertTriangle, Calendar } from 'lucide-react';
import { useEmergency } from '@/context/EmergencyContext';
import { COMPANIES } from '@/lib/mock-data';

export function StatsCards() {
  const { workers, liveCount, emergencyHistory } = useEmergency();
  const company = COMPANIES[0];
  const activeWorkers = workers.filter(w => w.status === 'active').length;
  const thisMonth = emergencyHistory.filter(e => {
    const d = new Date(e.startedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const cards = [
    { label: 'Total Travailleurs', value: `${company.currentWorkers}/${company.maxWorkers}`, icon: Users, color: '#4CAF50', bg: 'rgba(76,175,80,0.1)', border: 'rgba(76,175,80,0.3)', sub: `${company.maxWorkers - company.currentWorkers} postes disponibles` },
    { label: 'Actifs Maintenant', value: activeWorkers, icon: Zap, color: '#2196F3', bg: 'rgba(33,150,243,0.1)', border: 'rgba(33,150,243,0.3)', sub: 'En service actuellement' },
    { label: 'Urgences en direct', value: liveCount, icon: AlertTriangle, color: '#E53935', bg: liveCount > 0 ? 'rgba(229,57,53,0.15)' : 'rgba(229,57,53,0.05)', border: liveCount > 0 ? '#E53935' : 'rgba(229,57,53,0.2)', sub: liveCount > 0 ? '⚠ Intervention requise' : 'Aucune urgence active', pulse: liveCount > 0 },
    { label: 'Incidents ce mois', value: thisMonth, icon: Calendar, color: '#808080', bg: 'rgba(128,128,128,0.1)', border: 'rgba(128,128,128,0.2)', sub: 'Mois en cours' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div
          key={i}
          className="rounded-xl p-5 flex flex-col gap-3"
          style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
            animation: c.pulse ? 'emergency-pulse 1.5s ease-in-out infinite' : undefined,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: '#B0B0B0' }}>{c.label}</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
              <c.icon className="w-5 h-5" style={{ color: c.color }} />
            </div>
          </div>
          <div className="text-3xl font-black" style={{ color: c.color }}>{c.value}</div>
          <div className="text-xs" style={{ color: '#555' }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
