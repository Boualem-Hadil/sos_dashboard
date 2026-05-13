'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Heart, Bandage, Flame, Wind, Brain, Skull, Clock, MapPin } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useEmergency } from '@/context/EmergencyContext';
import { formatDateTime, formatDuration, getEmergencyTypeLabel, getSeverityLabel, getStatusLabel, exportToCSV } from '@/lib/utils';
import type { Emergency, EmergencyType } from '@/types';

const TYPE_ICONS: Record<EmergencyType, React.ReactNode> = {
  cardiac: <Heart className="w-4 h-4" style={{ color: '#E53935' }} />,
  trauma: <Bandage className="w-4 h-4" style={{ color: '#FF9800' }} />,
  fire: <Flame className="w-4 h-4" style={{ color: '#FF5722' }} />,
  respiratory: <Wind className="w-4 h-4" style={{ color: '#2196F3' }} />,
  neurological: <Brain className="w-4 h-4" style={{ color: '#9C27B0' }} />,
  poisoning: <Skull className="w-4 h-4" style={{ color: '#4CAF50' }} />,
};
const SEV_COLORS: Record<string, string> = { critical: '#E53935', moderate: '#FF9800', minor: '#4CAF50' };
const STA_COLORS: Record<string, string> = { resolved: '#4CAF50', false_alarm: '#808080', active: '#E53935', in_progress: '#FF9800' };

function EmergencyModal({ emergency, onClose }: { emergency: Emergency; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl rounded-2xl p-6 overflow-y-auto max-h-screen" style={{ background: '#111111', border: '1px solid #333' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Détail de l&apos;urgence</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1A1A1A' }}>
            <X className="w-4 h-4" style={{ color: '#808080' }} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {/* Worker */}
          <div className="p-4 rounded-xl" style={{ background: '#1A1A1A' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#555' }}>Travailleur</div>
            <div className="text-lg font-bold text-white">{emergency.workerName}</div>
            <div className="text-sm font-mono" style={{ color: '#808080' }}>{emergency.workerBadge} — {emergency.unit}</div>
          </div>
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Type', value: <div className="flex items-center gap-1.5">{TYPE_ICONS[emergency.type]}<span className="text-white">{getEmergencyTypeLabel(emergency.type)}</span></div> },
              { label: 'Sévérité', value: <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: `${SEV_COLORS[emergency.severity]}22`, color: SEV_COLORS[emergency.severity] }}>{getSeverityLabel(emergency.severity)}</span> },
              { label: 'Statut', value: <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: `${STA_COLORS[emergency.status]}22`, color: STA_COLORS[emergency.status] }}>{getStatusLabel(emergency.status)}</span> },
              { label: 'Durée', value: <span className="text-white">{emergency.duration ? formatDuration(emergency.duration) : '—'}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl" style={{ background: '#1A1A1A' }}>
                <div className="text-xs mb-1" style={{ color: '#555' }}>{label}</div>
                <div className="text-sm">{value}</div>
              </div>
            ))}
          </div>
          {/* Timeline */}
          <div className="p-4 rounded-xl" style={{ background: '#1A1A1A' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#555' }}>Chronologie</div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: '#E53935' }} />
                <div>
                  <div className="text-xs font-semibold text-white">Urgence déclenchée</div>
                  <div className="text-xs" style={{ color: '#808080' }}>{formatDateTime(emergency.startedAt)}</div>
                </div>
              </div>
              {emergency.respondedBy && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#FF9800' }} />
                  <div>
                    <div className="text-xs font-semibold text-white">Prise en charge: {emergency.respondedBy}</div>
                  </div>
                </div>
              )}
              {emergency.resolvedAt && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#4CAF50' }} />
                  <div>
                    <div className="text-xs font-semibold text-white">Résolue</div>
                    <div className="text-xs" style={{ color: '#808080' }}>{formatDateTime(emergency.resolvedAt)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Location */}
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#1A1A1A' }}>
            <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#808080' }} />
            <span className="text-sm" style={{ color: '#B0B0B0' }}>{emergency.location}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function EmergenciesPage() {
  const { emergencyHistory } = useEmergency();
  const [filters, setFilters] = useState({ type: '', severity: '', status: '', worker: '' });
  const [selected, setSelected] = useState<Emergency | null>(null);

  const filtered = useMemo(() => emergencyHistory.filter(e => {
    return (!filters.type || e.type === filters.type)
      && (!filters.severity || e.severity === filters.severity)
      && (!filters.status || e.status === filters.status)
      && (!filters.worker || e.workerName.toLowerCase().includes(filters.worker.toLowerCase()));
  }), [emergencyHistory, filters]);

  const stats = useMemo(() => ({
    total: filtered.length,
    resolved: filtered.filter(e => e.status === 'resolved').length,
    falseAlarms: filtered.filter(e => e.status === 'false_alarm').length,
    avgResponse: Math.round(filtered.filter(e => e.duration).reduce((acc, e) => acc + (e.duration ?? 0), 0) / (filtered.filter(e => e.duration).length || 1)),
  }), [filtered]);

  const handleExport = () => {
    exportToCSV(filtered.map(e => ({
      'Date': formatDateTime(e.startedAt),
      'Travailleur': e.workerName,
      'Badge': e.workerBadge,
      'Type': getEmergencyTypeLabel(e.type),
      'Sévérité': getSeverityLabel(e.severity),
      'Localisation': e.location,
      'Durée (min)': e.duration ?? '',
      'Statut': getStatusLabel(e.status),
    })), 'urgences_sos_algerie');
  };

  const sel = (k: string, v: string) => setFilters(f => ({ ...f, [k]: f[k as keyof typeof f] === v ? '' : v }));

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Historique des Urgences</h1>
            <p className="text-sm mt-1" style={{ color: '#808080' }}>Tous les incidents enregistrés</p>
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white" style={{ background: '#1A1A1A', border: '1px solid #333' }}>
            <Download className="w-4 h-4" /> Exporter CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: '#B0B0B0' },
            { label: 'Résolues', value: stats.resolved, color: '#4CAF50' },
            { label: 'Fausses alarmes', value: stats.falseAlarms, color: '#808080' },
            { label: 'Temps moyen (min)', value: stats.avgResponse, color: '#2196F3' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl text-center" style={{ background: '#111111', border: '1px solid #222' }}>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: '#808080' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input type="text" placeholder="Filtrer par travailleur..." value={filters.worker}
            onChange={e => setFilters(f => ({ ...f, worker: e.target.value }))}
            className="px-4 py-2.5 rounded-xl text-sm outline-none flex-1"
            style={{ background: '#111111', border: '1px solid #222', color: '#fff', minWidth: 180 }} />
          {(['cardiac','trauma','fire','respiratory','neurological','poisoning'] as const).map(t => (
            <button key={t} onClick={() => sel('type', t)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: filters.type === t ? 'rgba(229,57,53,0.2)' : '#111111', border: `1px solid ${filters.type === t ? '#E53935' : '#222'}`, color: filters.type === t ? '#E53935' : '#808080' }}>
              {getEmergencyTypeLabel(t)}
            </button>
          ))}
          {['critical','moderate','minor'].map(s => (
            <button key={s} onClick={() => sel('severity', s)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: filters.severity === s ? `${SEV_COLORS[s]}22` : '#111111', border: `1px solid ${filters.severity === s ? SEV_COLORS[s] : '#222'}`, color: filters.severity === s ? SEV_COLORS[s] : '#808080' }}>
              {getSeverityLabel(s as 'critical'|'moderate'|'minor')}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #222' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #1A1A1A' }}>
                {['Date/Heure','Travailleur','Type','Sévérité','Localisation','Durée','Statut','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < filtered.length-1 ? '1px solid #1A1A1A' : undefined, cursor:'pointer' }}
                  className="hover:bg-white/5 transition-colors" onClick={() => setSelected(e)}>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color:'#808080' }}>{formatDateTime(e.startedAt)}</td>
                  <td className="px-4 py-3 font-medium text-white">{e.workerName}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5">{TYPE_ICONS[e.type]}<span style={{ color:'#B0B0B0' }}>{getEmergencyTypeLabel(e.type)}</span></div></td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:`${SEV_COLORS[e.severity]}22`, color:SEV_COLORS[e.severity] }}>{getSeverityLabel(e.severity)}</span></td>
                  <td className="px-4 py-3 text-xs" style={{ color:'#808080' }}>{e.location}</td>
                  <td className="px-4 py-3 text-xs" style={{ color:'#B0B0B0' }}>{e.duration ? formatDuration(e.duration) : '—'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:`${STA_COLORS[e.status]}22`, color:STA_COLORS[e.status] }}>{getStatusLabel(e.status)}</span></td>
                  <td className="px-4 py-3"><button className="text-xs px-3 py-1.5 rounded-lg" style={{ background:'#1A1A1A', color:'#B0B0B0', border:'1px solid #333' }} onClick={ev=>{ev.stopPropagation();setSelected(e);}}>Voir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AnimatePresence>{selected && <EmergencyModal emergency={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
    </DashboardLayout>
  );
}
