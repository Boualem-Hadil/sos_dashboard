'use client';
import { Heart, Bandage, Flame, Wind, Brain, Skull } from 'lucide-react';
import { useEmergency } from '@/context/EmergencyContext';
import { formatDateTime, getEmergencyTypeLabel, getSeverityLabel, getStatusLabel } from '@/lib/utils';
import type { EmergencyType } from '@/types';

const TYPE_ICONS: Record<EmergencyType, React.ReactNode> = {
  cardiac:      <Heart    className="w-3.5 h-3.5" style={{ color: 'var(--sos-accent)' }} />,
  trauma:       <Bandage  className="w-3.5 h-3.5" style={{ color: 'var(--sos-warning)' }} />,
  fire:         <Flame    className="w-3.5 h-3.5" style={{ color: 'var(--sos-warning)' }} />,
  respiratory:  <Wind     className="w-3.5 h-3.5" style={{ color: 'var(--sos-info)' }} />,
  neurological: <Brain    className="w-3.5 h-3.5" style={{ color: '#A78BFA' }} />,
  poisoning:    <Skull    className="w-3.5 h-3.5" style={{ color: 'var(--sos-success)' }} />,
};

const SEVERITY: Record<string, { color: string; label: string }> = {
  critical: { color: 'var(--sos-accent)',   label: 'Critique' },
  moderate: { color: 'var(--sos-warning)',  label: 'Modéré' },
  minor:    { color: 'var(--sos-success)',  label: 'Mineur' },
};

const STATUS: Record<string, { color: string }> = {
  resolved:    { color: 'var(--sos-success)' },
  false_alarm: { color: 'var(--sos-text-muted)' },
  active:      { color: 'var(--sos-accent)' },
  in_progress: { color: 'var(--sos-warning)' },
};

export function RecentEmergencies() {
  const { emergencyHistory } = useEmergency();
  const recent = emergencyHistory.slice(0, 10);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--sos-bg-surface)',
        border: '1px solid var(--sos-border)',
        boxShadow: 'var(--sos-shadow)',
      }}
    >
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--sos-border)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--sos-text-primary)' }}>Urgences récentes</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--sos-text-muted)' }}>10 derniers incidents</p>
      </div>

      {recent.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--sos-text-muted)' }}>
          Aucun incident enregistré
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--sos-border-subtle)' }}>
                {['Date/Heure', 'Travailleur', 'Type', 'Sévérité', 'Statut'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--sos-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((e, i) => (
                <tr
                  key={e.id}
                  className="transition-colors"
                  style={{
                    borderBottom: i < recent.length - 1 ? '1px solid var(--sos-border-subtle)' : undefined,
                  }}
                >
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--sos-text-muted)' }} suppressHydrationWarning>
                    {formatDateTime(e.startedAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--sos-text-primary)' }}>
                    {e.workerName}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {TYPE_ICONS[e.type]}
                      <span className="text-xs" style={{ color: 'var(--sos-text-secondary)' }}>
                        {getEmergencyTypeLabel(e.type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-md text-xs font-semibold"
                      style={{
                        background: `${SEVERITY[e.severity]?.color ?? 'var(--sos-text-muted)'}18`,
                        color: SEVERITY[e.severity]?.color ?? 'var(--sos-text-muted)',
                      }}
                    >
                      {getSeverityLabel(e.severity)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-md text-xs font-semibold"
                      style={{
                        background: `${STATUS[e.status]?.color ?? 'var(--sos-text-muted)'}18`,
                        color: STATUS[e.status]?.color ?? 'var(--sos-text-muted)',
                      }}
                    >
                      {getStatusLabel(e.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
