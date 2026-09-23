'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Plus, Pencil, Archive, X, Check, Box } from 'lucide-react';
import { caGetDepartments, caCreateDepartment, caUpdateDepartment, caCreateUnit, caUpdateUnit } from '@/lib/company-admin-service';
import { useEmergency } from '@/context/EmergencyContext';
import type { Department, Unit } from '@/types';

function Modal({ title, onSave, onClose, initialValue = '' }: { title: string, onSave: (v: string) => Promise<void>, onClose: () => void, initialValue?: string }) {
  const [val, setVal] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const submit = async (e: any) => { e.preventDefault(); if (!val.trim()) return; setLoading(true); await onSave(val); setLoading(false); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: '#111', border: '1px solid #222' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input autoFocus value={val} onChange={e => setVal(e.target.value)} className="w-full px-3 py-2.5 rounded-xl outline-none" style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', color: '#fff' }} placeholder="Nom..." />
          <button disabled={loading || !val.trim()} className="w-full py-2.5 rounded-xl font-bold" style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.4)', color: '#0EA5E9' }}>
            {loading ? 'Enregistrement...' : 'Valider'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const { addToast } = useEmergency();
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<{ type: 'dept_new' | 'dept_edit' | 'unit_new' | 'unit_edit', targetId?: string, parentId?: string, init?: string } | null>(null);

  const reload = () => { setLoading(true); caGetDepartments().then(setDepts).finally(() => setLoading(false)); };
  useEffect(reload, []);

  const handleAction = async (val: string) => {
    try {
      if (modalMode?.type === 'dept_new') await caCreateDepartment(val);
      else if (modalMode?.type === 'dept_edit') await caUpdateDepartment(modalMode.targetId!, { name: val });
      else if (modalMode?.type === 'unit_new') await caCreateUnit(modalMode.parentId!, val);
      else if (modalMode?.type === 'unit_edit') await caUpdateUnit(modalMode.parentId!, modalMode.targetId!, { name: val });
      addToast({ type: 'success', title: 'Succès', message: 'Opération réussie' });
      reload();
    } catch (e: any) { addToast({ type: 'error', title: 'Erreur', message: e.message }); }
  };

  const toggleArchiveDept = async (d: Department) => {
    try { await caUpdateDepartment(d.id, { is_active: !d.is_active }); reload(); }
    catch (e: any) { addToast({ type: 'error', title: 'Erreur', message: e.message }); }
  };
  
  const toggleArchiveUnit = async (dId: string, u: Unit) => {
    try { await caUpdateUnit(dId, u.id, { is_active: !u.is_active }); reload(); }
    catch (e: any) { addToast({ type: 'error', title: 'Erreur', message: e.message }); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>Départements</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>Structure de votre organisation</p>
        </div>
        <button onClick={() => setModalMode({ type: 'dept_new' })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ background: '#0EA5E9' }}>
          <Plus className="w-4 h-4" /> Nouveau dépt.
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Chargement...</div>
      ) : depts.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-xl" style={{ borderColor: 'var(--sos-border)' }}>
          <p className="text-gray-500">Aucun département configuré.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {depts.map(d => (
            <div key={d.id} className="rounded-xl flex flex-col overflow-hidden transition-all" style={{ background: 'var(--sos-bg-surface)', border: `1px solid ${d.is_active ? 'var(--sos-border)' : 'var(--sos-border-subtle)'}`, opacity: d.is_active ? 1 : 0.6 }}>
              {/* Dept Header */}
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--sos-border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.1)', color: '#A78BFA' }}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{d.name}</h3>
                    <p className="text-xs text-gray-500">{d.units.length} unités</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setModalMode({ type: 'dept_edit', targetId: d.id, init: d.name })} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/5"><Pencil className="w-3.5 h-3.5 text-blue-400" /></button>
                  <button onClick={() => toggleArchiveDept(d)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/5">
                    {d.is_active ? <Archive className="w-3.5 h-3.5 text-gray-400" /> : <Check className="w-3.5 h-3.5 text-green-400" />}
                  </button>
                </div>
              </div>
              
              {/* Units */}
              <div className="p-3 flex flex-col gap-2 bg-[#0a0a0a]">
                {d.units.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#111', border: '1px solid #222', opacity: u.is_active ? 1 : 0.5 }}>
                    <div className="flex items-center gap-2">
                      <Box className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-sm text-gray-300">{u.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                      <button onClick={() => setModalMode({ type: 'unit_edit', targetId: u.id, parentId: d.id, init: u.name })} className="w-6 h-6 flex items-center justify-center"><Pencil className="w-3 h-3 text-blue-400" /></button>
                      <button onClick={() => toggleArchiveUnit(d.id, u)} className="w-6 h-6 flex items-center justify-center">{u.is_active ? <Archive className="w-3 h-3 text-gray-500" /> : <Check className="w-3 h-3 text-green-500" />}</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setModalMode({ type: 'unit_new', parentId: d.id })} className="flex items-center justify-center gap-2 py-2 mt-1 rounded-lg text-xs font-semibold hover:bg-white/5 transition-colors" style={{ color: '#0EA5E9', border: '1px dashed rgba(14,165,233,0.3)' }}>
                  <Plus className="w-3 h-3" /> Ajouter une unité
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalMode && (
          <Modal
            title={modalMode.type.includes('dept') ? 'Département' : 'Unité'}
            initialValue={modalMode.init}
            onClose={() => setModalMode(null)}
            onSave={handleAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
