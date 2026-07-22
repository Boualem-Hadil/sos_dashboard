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
        className="w-full max-w-xl rounded-2xl p-6 overflow-y-auto max-h-screen border" style={{ background: 'var(--sos-bg-surface)', borderColor: 'var(--sos-border)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--sos-text-primary)' }}>Détail de l&apos;urgence</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--sos-bg-hover)]" style={{ background: 'var(--sos-bg-surface-2)', border: '1px solid var(--sos-border)' }}>
            <X className="w-4 h-4" style={{ color: 'var(--sos-text-secondary)' }} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {/* Worker */}
          <div className="p-4 rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--sos-text-muted)' }}>Travailleur</div>
            <div className="text-lg font-bold" style={{ color: 'var(--sos-text-primary)' }}>{emergency.workerName}</div>
            <div className="text-sm font-mono" style={{ color: 'var(--sos-text-secondary)' }}>{emergency.workerBadge} — {emergency.unit}</div>
          </div>
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Type', value: <div className="flex items-center gap-1.5">{TYPE_ICONS[emergency.type]}<span style={{ color: 'var(--sos-text-primary)' }}>{getEmergencyTypeLabel(emergency.type)}</span></div> },
              { label: 'Sévérité', value: <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: `${SEV_COLORS[emergency.severity]}22`, color: SEV_COLORS[emergency.severity] }}>{getSeverityLabel(emergency.severity)}</span> },
              { label: 'Statut', value: <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: `${STA_COLORS[emergency.status]}22`, color: STA_COLORS[emergency.status] }}>{getStatusLabel(emergency.status)}</span> },
              { label: 'Durée', value: <span style={{ color: 'var(--sos-text-primary)' }}>{emergency.duration ? formatDuration(emergency.duration) : '—'}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--sos-text-muted)' }}>{label}</div>
                <div className="text-sm">{value}</div>
              </div>
            ))}
          </div>
          {/* Timeline */}
          <div className="p-4 rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--sos-text-muted)' }}>Chronologie</div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: '#E53935' }} />
                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--sos-text-primary)' }}>Urgence déclenchée</div>
                  <div className="text-xs" style={{ color: 'var(--sos-text-secondary)' }}>{formatDateTime(emergency.startedAt)}</div>
                </div>
              </div>
              {emergency.respondedBy && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#FF9800' }} />
                  <div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--sos-text-primary)' }}>Prise en charge: {emergency.respondedBy}</div>
                  </div>
                </div>
              )}
              {emergency.resolvedAt && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#4CAF50' }} />
                  <div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--sos-text-primary)' }}>Résolue</div>
                    <div className="text-xs" style={{ color: 'var(--sos-text-secondary)' }}>{formatDateTime(emergency.resolvedAt)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Location */}
          <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
            <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--sos-text-secondary)' }} />
            <span className="text-sm" style={{ color: 'var(--sos-text-primary)' }}>{emergency.location}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function EmergenciesPage() {
  const { emergencyHistory, authError } = useEmergency();
  const [filters, setFilters] = useState({ type: '', severity: '', status: '', worker: '' });
  const [selected, setSelected] = useState<Emergency | null>(null);

  if (authError) {
    return <DashboardLayout><div className="flex h-full items-center justify-center text-red-500 font-bold text-2xl tracking-widest">{authError}</div></DashboardLayout>;
  }

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
            <h1 className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>Historique des Urgences</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>Tous les incidents enregistrés</p>
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all hover:bg-[var(--sos-bg-hover)]" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }}>
            <Download className="w-4 h-4" /> Exporter CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'var(--sos-text-primary)' },
            { label: 'Résolues', value: stats.resolved, color: '#4CAF50' },
            { label: 'Fausses alarmes', value: stats.falseAlarms, color: 'var(--sos-text-secondary)' },
            { label: 'Temps moyen (min)', value: stats.avgResponse, color: '#2196F3' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl text-center border" style={{ background: 'var(--sos-bg-surface)', borderColor: 'var(--sos-border)', boxShadow: 'var(--sos-shadow)' }}>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--sos-text-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input type="text" placeholder="Filtrer par travailleur..." value={filters.worker}
            onChange={e => setFilters(f => ({ ...f, worker: e.target.value }))}
            className="px-4 py-2.5 rounded-xl text-sm outline-none flex-1 transition-all"
            style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)', minWidth: 180 }} />
          {(['cardiac','trauma','fire','respiratory','neurological','poisoning'] as const).map(t => (
            <button key={t} onClick={() => sel('type', t)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ 
                background: filters.type === t ? 'rgba(229,57,53,0.15)' : 'var(--sos-bg-surface)', 
                border: `1px solid ${filters.type === t ? '#E53935' : 'var(--sos-border)'}`, 
                color: filters.type === t ? '#E53935' : 'var(--sos-text-secondary)' 
              }}>
              {getEmergencyTypeLabel(t)}
            </button>
          ))}
          {['critical','moderate','minor'].map(s => (
            <button key={s} onClick={() => sel('severity', s)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ 
                background: filters.severity === s ? `${SEV_COLORS[s]}22` : 'var(--sos-bg-surface)', 
                border: `1px solid ${filters.severity === s ? SEV_COLORS[s] : 'var(--sos-border)'}`, 
                color: filters.severity === s ? SEV_COLORS[s] : 'var(--sos-text-secondary)' 
              }}>
              {getSeverityLabel(s as 'critical'|'moderate'|'minor')}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', boxShadow: 'var(--sos-shadow)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--sos-border)' }}>
                {['Date/Heure','Travailleur','Type','Sévérité','Localisation','Durée','Statut','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--sos-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < filtered.length-1 ? '1px solid var(--sos-border-subtle)' : undefined, cursor:'pointer' }}
                  className="hover:bg-[var(--sos-bg-hover)] transition-colors" onClick={() => setSelected(e)}>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color:'var(--sos-text-secondary)' }}>{formatDateTime(e.startedAt)}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--sos-text-primary)' }}>{e.workerName}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5">{TYPE_ICONS[e.type]}<span style={{ color:'var(--sos-text-secondary)' }}>{getEmergencyTypeLabel(e.type)}</span></div></td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:`${SEV_COLORS[e.severity]}22`, color:SEV_COLORS[e.severity] }}>{getSeverityLabel(e.severity)}</span></td>
                  <td className="px-4 py-3 text-xs" style={{ color:'var(--sos-text-secondary)' }}>{e.location}</td>
                  <td className="px-4 py-3 text-xs" style={{ color:'var(--sos-text-secondary)' }}>{e.duration ? formatDuration(e.duration) : '—'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:`${STA_COLORS[e.status]}22`, color:STA_COLORS[e.status] }}>{getStatusLabel(e.status)}</span></td>
                  <td className="px-4 py-3"><button className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--sos-bg-hover)]" style={{ background:'var(--sos-bg-surface-2)', color:'var(--sos-text-secondary)', border:'1px solid var(--sos-border)' }} onClick={ev=>{ev.stopPropagation();setSelected(e);}}>Voir</button></td>
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
