'use client';
import { useState, useEffect } from 'react';
import { Users, Search, Info } from 'lucide-react';
import { caGetWorkers, caGetDepartments } from '@/lib/company-admin-service';
import type { Department } from '@/types';

export default function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    caGetDepartments().then(setDepartments);
  }, []);

  useEffect(() => {
    setLoading(true);
    caGetWorkers(deptFilter || undefined)
      .then(setWorkers)
      .finally(() => setLoading(false));
  }, [deptFilter]);

  const filtered = workers.filter(w => {
    const q = search.toLowerCase();
    return !q || w.full_name.toLowerCase().includes(q) || w.employee_id?.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>Travailleurs</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>
            Total: {workers.length} collaborateurs
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#10B981' }} />
        <p className="text-xs" style={{ color: '#6EE7B7' }}>
          La création, modification et suppression des travailleurs est <strong>réservée aux agents de sécurité</strong> via leur panneau de contrôle. Vous avez ici une vue en lecture seule.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sos-text-muted)' }} />
          <input type="text" placeholder="Rechercher par nom ou ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }} />
        </div>
        <select
          value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="py-2.5 px-4 rounded-xl text-sm outline-none cursor-pointer"
          style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }}
        >
          <option value="">Tous les départements</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)', boxShadow: 'var(--sos-shadow)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--sos-border)' }}>
              {['', 'Nom', 'ID', 'Département / Unité', 'Poste', 'Statut'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--sos-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--sos-text-muted)' }}>Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--sos-text-muted)' }}>Aucun travailleur trouvé</td></tr>
            ) : filtered.map((w, i) => (
              <tr key={w.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--sos-border-subtle)' : undefined }}
                className="hover:bg-[var(--sos-bg-hover)] transition-colors">
                <td className="px-4 py-3 w-12">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Users className="w-4 h-4 text-gray-400" />
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-white">{w.full_name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{w.employee_id}</td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-300">{w.department || '—'}</div>
                  <div className="text-xs text-gray-500">{w.unit || '—'}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">{w.position || '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-bold"
                    style={{ background: w.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: w.is_active ? '#10B981' : '#6B7280' }}>
                    {w.is_active ? 'Actif' : 'Inactif'}
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
