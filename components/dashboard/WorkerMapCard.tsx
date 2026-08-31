'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { MapPin, Wifi, AlertTriangle, Users } from 'lucide-react';
import { useEmergency } from '@/context/EmergencyContext';
import type { WorkerLocation } from '@/types';

// Leaflet must only render on the client — dynamic import with ssr:false
const WorkerMap = dynamic(() => import('./WorkerMap'), { ssr: false, loading: () => <MapSkeleton /> });

// ── Skeleton shown while Leaflet loads ────────────────────────────────────────
function MapSkeleton() {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: 'var(--sos-bg-base)', borderRadius: '0.75rem' }}
    >
      <div style={{ color: 'var(--sos-text-muted)', fontSize: 14 }}>
        Chargement de la carte…
      </div>
    </div>
  );
}

// ── Legend dot ────────────────────────────────────────────────────────────────
function LegendDot({ colour, label }: { colour: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: colour,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 12, color: 'var(--sos-text-muted)' }}>{label}</span>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
export function WorkerMapCard() {
  const { workerLocations, isLoading } = useEmergency();

  // Convert the Record → array and sort so emergencies appear on top
  const locationsList: WorkerLocation[] = useMemo(() => {
    return Object.values(workerLocations).sort((a, b) => {
      if (a.status === 'emergency' && b.status !== 'emergency') return -1;
      if (b.status === 'emergency' && a.status !== 'emergency') return 1;
      return 0;
    });
  }, [workerLocations]);

  const activeCount    = locationsList.filter(l => l.status === 'active').length;
  const emergencyCount = locationsList.filter(l => l.status === 'emergency').length;
  const totalTracked   = locationsList.length;

  if (isLoading) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:  'var(--sos-bg-surface)',
        border:      '1px solid var(--sos-border)',
        boxShadow:   'var(--sos-shadow)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--sos-border)' }}
      >
        {/* Title */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(33,150,243,0.12)' }}
          >
            <MapPin className="w-5 h-5" style={{ color: '#2196F3' }} />
          </div>
          <div>
            <div className="font-bold text-base" style={{ color: 'var(--sos-text-primary)' }}>
              Localisation en direct
            </div>
            <div className="text-xs" style={{ color: 'var(--sos-text-muted)' }}>
              {totalTracked === 0
                ? 'En attente de données GPS…'
                : `${totalTracked} travailleur${totalTracked > 1 ? 's' : ''} suivi${totalTracked > 1 ? 's' : ''}`}
            </div>
          </div>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2">
          {emergencyCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{
                background: 'rgba(229,57,53,0.12)',
                border:     '1px solid rgba(229,57,53,0.3)',
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#E53935' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#E53935' }}>
                {emergencyCount} urgence{emergencyCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{
              background: 'rgba(76,175,80,0.10)',
              border:     '1px solid rgba(76,175,80,0.25)',
            }}
          >
            <Users className="w-3.5 h-3.5" style={{ color: '#4CAF50' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4CAF50' }}>
              {activeCount} actif{activeCount > 1 ? 's' : ''}
            </span>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(33,150,243,0.08)', border: '1px solid rgba(33,150,243,0.2)' }}
          >
            <Wifi className="w-3.5 h-3.5" style={{ color: '#2196F3' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#2196F3' }}>EN DIRECT</span>
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div style={{ height: 360, position: 'relative' }}>
        {totalTracked === 0 ? (
          // Empty state
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-3"
            style={{ background: 'var(--sos-bg-base)' }}
          >
            <MapPin className="w-10 h-10" style={{ color: 'var(--sos-text-muted)', opacity: 0.4 }} />
            <div style={{ color: 'var(--sos-text-muted)', fontSize: 14, textAlign: 'center' }}>
              Aucune position GPS reçue pour l&apos;instant.
              <br />
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                Les travailleurs apparaîtront ici dès qu&apos;ils ouvrent l&apos;application.
              </span>
            </div>
          </div>
        ) : (
          <WorkerMap locations={locationsList} />
        )}
      </div>

      {/* ── Footer legend ── */}
      <div
        className="flex items-center gap-5 px-5 py-3"
        style={{ borderTop: '1px solid var(--sos-border)' }}
      >
        <LegendDot colour="#4CAF50" label="Actif (sûr)" />
        <LegendDot colour="#E53935" label="Urgence en cours" />
        <LegendDot colour="#607D8B" label="Hors ligne" />
        <div className="ml-auto text-xs" style={{ color: 'var(--sos-text-muted)' }}>
          Mise à jour toutes les ~15 s
        </div>
      </div>
    </div>
  );
}
