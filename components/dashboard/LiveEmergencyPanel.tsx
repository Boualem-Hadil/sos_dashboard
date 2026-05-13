'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Bandage, Flame, Wind, Brain, Skull, MapPin, Phone, CheckCircle, Clock } from 'lucide-react';
import { useEmergency } from '@/context/EmergencyContext';
import { useAlarm } from '@/hooks/useAlarm';
import { getBloodTypeColor, getEmergencyTypeLabel, getSeverityLabel, formatElapsedTime } from '@/lib/utils';
import type { EmergencyType } from '@/types';

const TYPE_ICONS: Record<EmergencyType, React.ReactNode> = {
  cardiac: <Heart className="w-6 h-6" style={{ color: '#E53935' }} />,
  trauma: <Bandage className="w-6 h-6" style={{ color: '#FF9800' }} />,
  fire: <Flame className="w-6 h-6" style={{ color: '#FF5722' }} />,
  respiratory: <Wind className="w-6 h-6" style={{ color: '#2196F3' }} />,
  neurological: <Brain className="w-6 h-6" style={{ color: '#9C27B0' }} />,
  poisoning: <Skull className="w-6 h-6" style={{ color: '#4CAF50' }} />,
};

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(formatElapsedTime(startedAt));
  useEffect(() => {
    const t = setInterval(() => setElapsed(formatElapsedTime(startedAt)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return <span className="font-mono font-bold text-2xl" style={{ color: '#E53935' }}>{elapsed}</span>;
}

export function LiveEmergencyPanel() {
  const { status, currentEmergency, resolveEmergency, addToast } = useEmergency();
  const { stopAlarm } = useAlarm();

  const handleResolve = () => {
    resolveEmergency();
    stopAlarm();
    addToast({ type: 'success', title: '✅ Urgence résolue', message: 'Le panneau a été fermé et l\'historique mis à jour.' });
  };

  return (
    <AnimatePresence>
      {status === 'active' && currentEmergency && (
        <motion.div
          key="emergency-panel"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="rounded-2xl p-6 emergency-pulse"
          style={{ background: 'rgba(229,57,53,0.08)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <div className="absolute inset-0 w-4 h-4 rounded-full bg-red-500 ping-dot" />
              </div>
              <span className="text-lg font-black text-white tracking-wide">🚨 URGENCE EN COURS</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold badge-pulse" style={{ background: '#E53935', color: '#fff' }}>
                {getSeverityLabel(currentEmergency.severity).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.3)' }}>
              <Clock className="w-4 h-4" style={{ color: '#E53935' }} />
              <ElapsedTimer startedAt={currentEmergency.startedAt} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Left: Worker + type */}
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl" style={{ background: '#1A1A1A', border: '1px solid #333' }}>
                <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#808080' }}>Travailleur</div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ background: '#E53935' }}>
                    {currentEmergency.workerName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{currentEmergency.workerName}</div>
                    <div className="text-sm font-mono" style={{ color: '#B0B0B0' }}>Badge: {currentEmergency.workerBadge}</div>
                    <div className="text-sm" style={{ color: '#808080' }}>{currentEmergency.unit}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl" style={{ background: '#1A1A1A', border: '1px solid #333' }}>
                <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#808080' }}>Type d&apos;urgence</div>
                <div className="flex items-center gap-3">
                  {TYPE_ICONS[currentEmergency.type]}
                  <span className="text-lg font-bold text-white">{getEmergencyTypeLabel(currentEmergency.type)}</span>
                </div>
                {currentEmergency.notes && (
                  <p className="mt-2 text-sm" style={{ color: '#B0B0B0' }}>{currentEmergency.notes}</p>
                )}
              </div>

              {/* Location */}
              {currentEmergency.gpsCoordinates && (
                <div className="p-4 rounded-xl" style={{ background: '#1A1A1A', border: '1px solid #333' }}>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#808080' }}>Localisation GPS</div>
                  <div className="text-sm text-white mb-1">{currentEmergency.location}</div>
                  <div className="text-xs font-mono mb-3" style={{ color: '#808080' }}>
                    {currentEmergency.gpsCoordinates.lat.toFixed(4)}, {currentEmergency.gpsCoordinates.lng.toFixed(4)}
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${currentEmergency.gpsCoordinates.lat},${currentEmergency.gpsCoordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                    style={{ background: 'rgba(33,150,243,0.15)', border: '1px solid rgba(33,150,243,0.3)', color: '#2196F3' }}
                  >
                    <MapPin className="w-4 h-4" /> Ouvrir dans Maps
                  </a>
                </div>
              )}
            </div>

            {/* Right: Medical profile */}
            {currentEmergency.medicalProfile && (
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl" style={{ background: '#1A1A1A', border: '1px solid #333' }}>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#808080' }}>Profil Médical</div>
                  {/* Blood type */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm" style={{ color: '#B0B0B0' }}>Groupe sanguin:</span>
                    <span className="px-3 py-1 rounded-lg text-sm font-black text-white" style={{ background: getBloodTypeColor(currentEmergency.medicalProfile.bloodType) }}>
                      {currentEmergency.medicalProfile.bloodType}
                    </span>
                  </div>
                  {/* Allergies */}
                  {currentEmergency.medicalProfile.allergies.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-semibold mb-1" style={{ color: '#E53935' }}>⚠ ALLERGIES</div>
                      <div className="flex flex-wrap gap-2">
                        {currentEmergency.medicalProfile.allergies.map(a => (
                          <span key={a} className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(229,57,53,0.2)', color: '#EF5350', border: '1px solid rgba(229,57,53,0.4)' }}>{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Chronic diseases */}
                  {currentEmergency.medicalProfile.chronicDiseases.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-semibold mb-1" style={{ color: '#808080' }}>Maladies chroniques</div>
                      {currentEmergency.medicalProfile.chronicDiseases.map(d => (
                        <div key={d} className="text-sm" style={{ color: '#B0B0B0' }}>• {d}</div>
                      ))}
                    </div>
                  )}
                  {/* Notes */}
                  {currentEmergency.medicalProfile.emergencyNotes && (
                    <div className="mb-3 p-2 rounded-lg" style={{ background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.3)' }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#FF9800' }}>Notes d&apos;urgence</div>
                      <div className="text-xs" style={{ color: '#B0B0B0' }}>{currentEmergency.medicalProfile.emergencyNotes}</div>
                    </div>
                  )}
                  {/* ICE */}
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#808080' }}>Contact d&apos;urgence (ICE)</div>
                    <div className="text-sm font-medium text-white">{currentEmergency.medicalProfile.iceContact.name}</div>
                    <div className="text-xs" style={{ color: '#808080' }}>{currentEmergency.medicalProfile.iceContact.relation} — {currentEmergency.medicalProfile.iceContact.phone}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-5">
            <button id="btn-resolve" onClick={handleResolve} className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ background: '#4CAF50' }}>
              <CheckCircle className="w-5 h-5" /> Marquer comme résolue
            </button>
            <a href="tel:15" className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all hover:opacity-90" style={{ background: 'rgba(229,57,53,0.2)', border: '1px solid #E53935', color: '#E53935' }}>
              <Phone className="w-5 h-5" /> Appeler SAMU — 15
            </a>
            <a href={`tel:${currentEmergency.medicalProfile?.iceContact.phone ?? ''}`} className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all hover:opacity-90" style={{ background: '#1A1A1A', border: '1px solid #333', color: '#B0B0B0' }}>
              <Phone className="w-5 h-5" /> Appeler Travailleur
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
