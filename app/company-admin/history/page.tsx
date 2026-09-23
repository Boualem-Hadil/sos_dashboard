'use client';
import { useState, useEffect } from 'react';
import { History as HistoryIcon, Search, Download, Filter } from 'lucide-react';
import { caGetHistory } from '@/lib/company-admin-service';
const TYPE_LABELS: Record<string, string> = {
  cardiac: 'Cardiaque',
  trauma: 'Traumatisme',
  respiratory: 'Respiratoire',
  neurological: 'Neurologique',
  poisoning: 'Intoxication',
  fire: 'Incendie',
  other: 'Autre',
};

const TYPE_COLORS: Record<string, string> = {
  cardiac: '#E53935',
  trauma: '#FF9800',
  respiratory: '#2196F3',
  neurological: '#9C27B0',
  poisoning: '#4CAF50',
  fire: '#FF5722',
  other: '#9E9E9E',
};

export default function HistoryPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({ type: '', status: '', date_from: '', date_to: '' });

  const reload = () => {
    setLoading(true);
    caGetHistory(filters).then(setEvents).finally(() => setLoading(false));
  };

  useEffect(reload, [filters]);

  const exportCSV = () => {
    const head = ['ID', 'Type', 'Statut', 'Date début', 'Date résolution', 'Employé', 'Département', 'Localisation'];
    const rows = events.map(e => [
      e.id, TYPE_LABELS[e.type as keyof typeof TYPE_LABELS] || e.type, e.status,
      e.started_at, e.resolved_at || '', e.user?.full_name || '', e.department || '', `"${e.location_description || ''}"`
    ]);
    const csv = [head.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.setAttribute('download', `echoalert_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>Historique des urgences</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>Registre des incidents passés (Lecture seule)</p>
        </div>
        <button onClick={exportCSV} disabled={events.length === 0} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ background: '#10B981' }}>
          <Download className="w-4 h-4" /> Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className="py-2.5 px-4 rounded-xl text-sm outline-none cursor-pointer" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="py-2.5 px-4 rounded-xl text-sm outline-none cursor-pointer" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }}>
          <option value="">Tous les statuts</option>
          <option value="resolved">Résolue</option>
          <option value="false_alarm">Fausse alerte</option>
        </select>
        <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} className="py-2.5 px-4 rounded-xl text-sm outline-none cursor-pointer" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }} />
        <span className="py-2.5 text-gray-500">—</span>
        <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} className="py-2.5 px-4 rounded-xl text-sm outline-none cursor-pointer" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }} />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', boxShadow: 'var(--sos-shadow)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--sos-border)' }}>
              {['Date', 'Type', 'Statut', 'Employé', 'Département', 'Durée'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--sos-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--sos-text-muted)' }}>Chargement...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--sos-text-muted)' }}>Aucun enregistrement trouvé.</td></tr>
            ) : events.map((e, i) => {
              const color = TYPE_COLORS[e.type as keyof typeof TYPE_COLORS] || '#808080';
              const label = TYPE_LABELS[e.type as keyof typeof TYPE_LABELS] || e.type;
              let dur = '—';
              if (e.started_at && e.resolved_at) {
                const diff = Math.round((new Date(e.resolved_at).getTime() - new Date(e.started_at).getTime()) / 60000);
                dur = `${diff} min`;
              }
              return (
                <tr key={e.id} style={{ borderBottom: i < events.length - 1 ? '1px solid var(--sos-border-subtle)' : undefined }} className="hover:bg-[var(--sos-bg-hover)] transition-colors">
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--sos-text-secondary)' }}>
                    {new Date(e.started_at).toLocaleString('fr-DZ', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color }}>{label}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: e.status === 'resolved' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: e.status === 'resolved' ? '#22C55E' : '#F59E0B' }}>
                      {e.status === 'resolved' ? 'Résolue' : 'Fausse alerte'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{e.user?.full_name || '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--sos-text-muted)' }}>{e.department || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--sos-text-secondary)' }}>{dur}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
