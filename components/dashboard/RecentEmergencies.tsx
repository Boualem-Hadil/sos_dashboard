'use client';
import { Heart, Bandage, Flame, Wind, Brain, Skull } from 'lucide-react';
import { useEmergency } from '@/context/EmergencyContext';
import { formatDateTime, getEmergencyTypeLabel, getSeverityLabel, getStatusLabel } from '@/lib/utils';
import type { EmergencyType } from '@/types';

const TYPE_ICONS: Record<EmergencyType, React.ReactNode> = {
  cardiac: <Heart className="w-4 h-4" style={{ color: '#E53935' }} />,
  trauma: <Bandage className="w-4 h-4" style={{ color: '#FF9800' }} />,
  fire: <Flame className="w-4 h-4" style={{ color: '#FF5722' }} />,
  respiratory: <Wind className="w-4 h-4" style={{ color: '#2196F3' }} />,
  neurological: <Brain className="w-4 h-4" style={{ color: '#9C27B0' }} />,
  poisoning: <Skull className="w-4 h-4" style={{ color: '#4CAF50' }} />,
};

const SEVERITY_COLORS = { critical: '#E53935', moderate: '#FF9800', minor: '#4CAF50' };
const STATUS_COLORS: Record<string, string> = { resolved: '#4CAF50', false_alarm: '#808080', active: '#E53935', in_progress: '#FF9800' };

export function RecentEmergencies() {
  const { emergencyHistory } = useEmergency();
  const recent = emergencyHistory.slice(0, 10);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #222' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #222' }}>
        <h2 className="text-base font-bold text-white">Urgences récentes</h2>
        <p className="text-xs" style={{ color: '#808080' }}>10 derniers incidents</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #1A1A1A' }}>
              {['Date/Heure', 'Travailleur', 'Type', 'Sévérité', 'Unité', 'Statut'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((e, i) => (
              <tr key={e.id} style={{ borderBottom: i < recent.length - 1 ? '1px solid #1A1A1A' : undefined, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <td className="px-4 py-3 text-xs font-mono" style={{ color: '#808080' }} suppressHydrationWarning>{formatDateTime(e.startedAt)}</td>
                <td className="px-4 py-3 font-medium text-white">{e.workerName}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {TYPE_ICONS[e.type]}
                    <span style={{ color: '#B0B0B0' }}>{getEmergencyTypeLabel(e.type)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: `${SEVERITY_COLORS[e.severity]}22`, color: SEVERITY_COLORS[e.severity] }}>
                    {getSeverityLabel(e.severity)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: '#808080' }}>{e.unit}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: `${STATUS_COLORS[e.status]}22`, color: STATUS_COLORS[e.status] }}>
                    {getStatusLabel(e.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
