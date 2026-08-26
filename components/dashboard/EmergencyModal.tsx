import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmergency } from '@/context/EmergencyContext';
import { resolveEmergencyApi, sendPingApi, getNearbyWorkersApi } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  PhoneCall, MapPin, AlertTriangle, HeartPulse, Volume2, VolumeX,
  CheckCircle, ShieldAlert, Phone, Map as MapIcon, ChevronDown, ChevronUp,
  Bell, Users, Loader2, Navigation,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { NearbyWorker } from '@/types';

const SOSMap = dynamic(() => import('@/components/dashboard/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center">
      Chargement carte...
    </div>
  ),
});

// ── Ping cooldown window in milliseconds (mirrors backend PING_RESPONSE_WINDOW_SECONDS) ──
const PING_WINDOW_MS = 60_000;

export function EmergencyModal() {
  const {
    status, currentEmergency, resolveEmergency, resolveEmergencyById, addToast,
    activeEmergencies, selectedEmergencyId, selectEmergency,
  } = useEmergency();
  const [isMuted, setIsMuted] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Resolution fields
  const [responderType, setResponderType] = useState<'police' | 'samu' | 'fire' | 'other' | undefined>();
  const [etaMinutes, setEtaMinutes] = useState<number | ''>('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // ── Ping state ─────────────────────────────────────────────────────────────
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [pingCooldownLeft, setPingCooldownLeft] = useState(0); // seconds remaining in cooldown
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Nearby workers state ───────────────────────────────────────────────────
  const [showNearby, setShowNearby] = useState(false);
  const [nearbyWorkers, setNearbyWorkers] = useState<NearbyWorker[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  // ── Not-responding poll: after PING_SENT, flip notResponding after 60 s ───
  const notRespondingRef = useRef(false);
  const notRespondingTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentEmergency?.pingStatus === 'sent' && !notRespondingRef.current) {
      notRespondingRef.current = true;
      notRespondingTimer.current = setTimeout(() => {
        // After 60 s with no ack, the SSE HEARTBEAT_UPDATED will carry
        // not_responding=true from the backend. This timeout is a client-side
        // fallback in case the SSE event is missed.
        notRespondingRef.current = false;
      }, PING_WINDOW_MS + 2000);
    }
    if (currentEmergency?.pingStatus === 'acked') {
      notRespondingRef.current = false;
      if (notRespondingTimer.current) clearTimeout(notRespondingTimer.current);
    }
    return () => {
      if (notRespondingTimer.current) clearTimeout(notRespondingTimer.current);
    };
  }, [currentEmergency?.pingStatus]);

  // ── Ping cooldown countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (pingCooldownLeft <= 0) return;
    pingTimerRef.current = setInterval(() => {
      setPingCooldownLeft(prev => {
        if (prev <= 1) {
          if (pingTimerRef.current) clearInterval(pingTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (pingTimerRef.current) clearInterval(pingTimerRef.current); };
  }, [pingCooldownLeft]);

  // ── Web Audio API for beeping ───────────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === 'active' && currentEmergency && !isMuted) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const playBeep = () => {
        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        const oscillator = audioCtxRef.current!.createOscillator();
        const gainNode = audioCtxRef.current!.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtxRef.current!.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtxRef.current!.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, audioCtxRef.current!.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtxRef.current!.currentTime + 0.3);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtxRef.current!.destination);
        oscillator.start();
        oscillator.stop(audioCtxRef.current!.currentTime + 0.3);
      };

      playBeep();
      intervalRef.current = setInterval(playBeep, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, currentEmergency, isMuted]);

  const multiMode = activeEmergencies.length > 1;

  // ── Second audio: two quick beeps at 1200 Hz every 20 s when multi-emergency ──
  const multiBeepRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (multiMode && !isMuted && audioCtxRef.current) {
      const playDoubleBeep = () => {
        if (!audioCtxRef.current) return;
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        [0, 0.18].forEach((offset) => {
          const osc = audioCtxRef.current!.createOscillator();
          const gain = audioCtxRef.current!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, audioCtxRef.current!.currentTime + offset);
          gain.gain.setValueAtTime(0, audioCtxRef.current!.currentTime + offset);
          gain.gain.linearRampToValueAtTime(0.8, audioCtxRef.current!.currentTime + offset + 0.04);
          gain.gain.linearRampToValueAtTime(0, audioCtxRef.current!.currentTime + offset + 0.18);
          osc.connect(gain);
          gain.connect(audioCtxRef.current!.destination);
          osc.start(audioCtxRef.current!.currentTime + offset);
          osc.stop(audioCtxRef.current!.currentTime + offset + 0.18);
        });
      };
      playDoubleBeep(); // play immediately on second emergency arrival
      multiBeepRef.current = setInterval(playDoubleBeep, 20_000);
    } else {
      if (multiBeepRef.current) clearInterval(multiBeepRef.current);
    }
    return () => { if (multiBeepRef.current) clearInterval(multiBeepRef.current); };
  }, [multiMode, isMuted]);

  // Reset per-emergency UI state when selected emergency switches
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedEmergencyId !== prevSelectedRef.current) {
      prevSelectedRef.current = selectedEmergencyId;
      setIsMapExpanded(false);
      setShowNearby(false);
      setNearbyWorkers([]);
      setNearbyError(null);
      setPingCooldownLeft(0);
      setResponderType(undefined);
      setEtaMinutes('');
      setResolutionNotes('');
    }
  }, [selectedEmergencyId]);

  if (status !== 'active' || !currentEmergency) return null;

  // ── Resolve handler ────────────────────────────────────────────────────────
  const handleResolve = async () => {
    // Capture the id BEFORE the await — the SSE EMERGENCY_RESOLVED echo may arrive
    // before the HTTP response returns, which would already move selectedEmergencyId
    // to the next emergency. Using resolveEmergencyById is idempotent: the second
    // call (whichever arrives second, SSE or HTTP response) is a no-op.
    const emergencyId = currentEmergency.id;
    setIsResolving(true);
    try {
      const token = getToken();
      if (!token) throw new Error('No token');
      await resolveEmergencyApi(
        emergencyId,
        'resolved',
        token,
        responderType,
        etaMinutes === '' ? undefined : Number(etaMinutes),
        resolutionNotes || undefined,
      );
      resolveEmergencyById(emergencyId); // id-based, no-ops if SSE already handled it
      setResponderType(undefined);
      setEtaMinutes('');
      setResolutionNotes('');
      addToast({ type: 'success', title: 'Urgence résolue', message: 'La situation a été marquée comme résolue.' });
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de résoudre l\'urgence.' });
    } finally {
      setIsResolving(false);
    }
  };

  // ── Ping handler ───────────────────────────────────────────────────────────
  const handleSendPing = async () => {
    if (isSendingPing || pingCooldownLeft > 0) return;
    setIsSendingPing(true);
    try {
      const token = getToken();
      if (!token) throw new Error('No token');
      await sendPingApi(currentEmergency.id, token);
      addToast({ type: 'info', title: '🔔 Ping envoyé', message: 'Le travailleur a 10 secondes pour répondre.' });
      // Cooldown: 10 s so officer can quickly re-ping if needed
      setPingCooldownLeft(10);
    } catch {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible d\'envoyer le ping.' });
    } finally {
      setIsSendingPing(false);
    }
  };

  // ── Nearby workers handler ─────────────────────────────────────────────────
  const handleFindNearby = async () => {
    setShowNearby(true);
    setIsLoadingNearby(true);
    setNearbyError(null);
    try {
      const token = getToken();
      if (!token) throw new Error('No token');
      const res = await getNearbyWorkersApi(currentEmergency.id, token, 5);
      setNearbyWorkers(res?.data ?? []);
    } catch (err: any) {
      setNearbyError(err?.message || 'Erreur lors de la recherche');
    } finally {
      setIsLoadingNearby(false);
    }
  };

  const { type, severity, workerName, location, medicalProfile, gpsCoordinates } = currentEmergency;
  const apiLat = (currentEmergency as any).latitude;
  const apiLng = (currentEmergency as any).longitude;
  const hasCoordinates = !!gpsCoordinates || (apiLat !== undefined && apiLng !== undefined && apiLat !== null && apiLng !== null);
  const mapCenter: [number, number] = gpsCoordinates
    ? [gpsCoordinates.lat, gpsCoordinates.lng]
    : hasCoordinates ? [apiLat, apiLng] : [0, 0];

  // Derived "not responding" — from SSE live updates or local state
  const isNotResponding = currentEmergency.notResponding === true;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        {/* Pulsing background */}
        <motion.div
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute inset-0 bg-red-600/20"
        />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-5xl border-2 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
          style={{ background: 'var(--sos-bg-surface)', borderColor: '#E53935' }}
        >
          {/* Header */}
          <div className="bg-red-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3 text-white">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
              <h2 className="text-2xl font-bold tracking-wider uppercase">
                Urgence Détectée
                {multiMode && (
                  <span className="ml-3 text-base font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                    {activeEmergencies.length} actives
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white"
              title={isMuted ? 'Activer le son' : 'Désactiver le son'}
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
          </div>

          {/* Body: sidebar (multi only) + main content */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── Multi-emergency sidebar ───────────────────────────────────── */}
            {multiMode && (
              <div className="w-64 flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: 'var(--sos-border)', background: 'var(--sos-bg-surface-2)' }}>
                <div className="px-4 py-3 text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--sos-text-muted)' }}>Urgences actives</div>
                {activeEmergencies.map((e) => {
                  const isSelected = e.id === selectedEmergencyId;
                  const elapsedMin = Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 60000);
                  const severityColor = e.severity === 'critical' ? '#ef4444' : e.severity === 'moderate' ? '#f59e0b' : '#22c55e';
                  const hasDuplicate = (e.possible_duplicate_of?.length ?? 0) > 0;
                  return (
                    <button
                      key={e.id}
                      onClick={() => selectEmergency(e.id)}
                      className="w-full text-left px-4 py-4 border-b transition-colors"
                      style={{
                        borderColor: 'var(--sos-border)',
                        background: isSelected ? 'rgba(239,68,68,0.12)' : 'transparent',
                        borderLeft: isSelected ? '4px solid #ef4444' : '4px solid transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: severityColor }} />
                        <span className="text-sm font-bold truncate" style={{ color: 'var(--sos-text-primary)' }}>{e.workerName}</span>
                      </div>
                      <div className="text-sm capitalize font-medium" style={{ color: 'var(--sos-text-secondary)' }}>{e.type}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--sos-text-muted)' }}>{elapsedMin} min</div>
                      {hasDuplicate && (
                        <div className="mt-1.5 text-xs font-semibold" style={{ color: '#f59e0b' }}>
                          ⚠ doublon possible
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Main modal content ────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">

            {/* ── NOT-RESPONDING ALERT (Phase D) ─────────────────────────────── */}
            <AnimatePresence>
              {isNotResponding && (
                <motion.div
                  initial={{ opacity: 0, y: -12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.97 }}
                  className="relative overflow-hidden rounded-xl border-2 p-4"
                  style={{ borderColor: '#FF6F00', background: 'linear-gradient(135deg, rgba(255,111,0,0.18) 0%, rgba(255,160,0,0.12) 100%)' }}
                >
                  {/* animated shimmer stripe */}
                  <motion.div
                    className="absolute inset-0 opacity-20"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,180,0,0.6), transparent)', width: '50%' }}
                  />
                  <div className="flex items-start gap-3 relative">
                    <motion.div
                      animate={{ scale: [1, 1.18, 1] }}
                      transition={{ repeat: Infinity, duration: 0.9 }}
                    >
                      <Bell className="w-6 h-6 mt-0.5" style={{ color: '#FF6F00' }} />
                    </motion.div>
                    <div className="flex-1">
                      <p className="font-black text-sm uppercase tracking-widest" style={{ color: '#FF6F00' }}>
                        ⚠ Travailleur ne répond pas
                      </p>
                      <p className="text-sm mt-1" style={{ color: 'var(--sos-text-primary)' }}>
                        Le travailleur n&apos;a pas répondu au ping. Envisagez d&apos;appeler les travailleurs proches.
                      </p>
                    </div>
                    <button
                      onClick={handleFindNearby}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all"
                      style={{ background: '#FF6F00', color: '#fff' }}
                    >
                      <Users className="w-4 h-4" /> Chercher proches
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border flex flex-col" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
                <span className="text-sm font-semibold uppercase mb-1" style={{ color: 'var(--sos-text-secondary)' }}>Employé</span>
                <span className="text-xl font-bold" style={{ color: 'var(--sos-text-primary)' }}>{workerName}</span>
                {currentEmergency.workerPhone && (
                  <a
                    href={`tel:${currentEmergency.workerPhone}`}
                    className="mt-2 flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg w-fit transition-colors"
                    style={{ background: 'rgba(33,150,243,0.15)', border: '1px solid rgba(33,150,243,0.35)', color: '#2196F3' }}
                  >
                    <Phone className="w-4 h-4" /> Appeler le travailleur
                  </a>
                )}
              </div>
              <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
                <div>
                  <span className="text-sm font-semibold uppercase mb-1" style={{ color: 'var(--sos-text-secondary)' }}>Localisation</span>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-500" />
                    <span className="text-xl font-bold" style={{ color: 'var(--sos-text-primary)' }}>{location}</span>
                  </div>
                </div>
                {hasCoordinates ? (
                  <button
                    onClick={() => setIsMapExpanded(!isMapExpanded)}
                    className="mt-3 flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors bg-blue-50 hover:bg-blue-100 text-blue-700 w-fit"
                  >
                    <MapIcon className="w-4 h-4" />
                    {isMapExpanded ? 'Masquer la carte' : 'Afficher sur la carte'}
                    {isMapExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                ) : (
                  <div className="mt-3 text-sm font-semibold italic flex items-center gap-2" style={{ color: 'var(--sos-text-muted)' }}>
                    <MapPin className="w-4 h-4" /> Position GPS non disponible
                  </div>
                )}
              </div>
            </div>

            {/* Expandable victim map */}
            <AnimatePresence>
              {isMapExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="h-[280px] w-full rounded-xl border mt-2 shadow-inner" style={{ borderColor: 'var(--sos-border)' }}>
                    <SOSMap center={mapCenter} zoom={15} label={`Urgence: ${workerName}`} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Emergency Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Situation */}
              <div className="flex-1 p-6 rounded-xl border" style={{ background: 'rgba(229,57,53,0.06)', borderColor: 'rgba(229,57,53,0.2)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h3 className="text-red-500 font-bold text-lg">Situation</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm" style={{ color: 'var(--sos-text-secondary)' }}>Type</div>
                    <div className="font-semibold text-lg capitalize" style={{ color: 'var(--sos-text-primary)' }}>{type}</div>
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: 'var(--sos-text-secondary)' }}>Sévérité</div>
                    <div className="font-semibold text-lg capitalize" style={{ color: 'var(--sos-text-primary)' }}>
                      {severity?.toLowerCase() === 'critical' ? '🔴 Critique' : severity?.toLowerCase() === 'moderate' ? '🟡 Modérée' : '🟢 Mineure'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Profile */}
              <div className="flex-1 p-6 rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <HeartPulse className="w-6 h-6 text-pink-500" />
                  <h3 className="text-pink-500 font-bold text-lg">Profil Médical</h3>
                </div>
                {medicalProfile ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 rounded" style={{ background: 'var(--sos-bg-surface)' }}>
                      <span className="text-sm" style={{ color: 'var(--sos-text-secondary)' }}>Groupe Sanguin</span>
                      <span className="font-bold text-red-500">{medicalProfile.bloodType}</span>
                    </div>
                    <div>
                      <span className="text-sm block mb-1" style={{ color: 'var(--sos-text-secondary)' }}>Allergies</span>
                      {medicalProfile.allergies && medicalProfile.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {medicalProfile.allergies.map((a: string, i: number) => (
                            <span key={i} className="px-2 py-1 text-xs rounded-md font-semibold" style={{ background: 'rgba(229,57,53,0.12)', color: '#EF5350' }}>{a}</span>
                          ))}
                        </div>
                      ) : <span className="text-sm" style={{ color: 'var(--sos-text-muted)' }}>Aucune connue</span>}
                    </div>
                    <div>
                      <span className="text-sm block mb-1" style={{ color: 'var(--sos-text-secondary)' }}>Maladies Chroniques</span>
                      {medicalProfile.chronicDiseases && medicalProfile.chronicDiseases.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {medicalProfile.chronicDiseases.map((a: string, i: number) => (
                            <span key={i} className="px-2 py-1 text-xs rounded-md font-semibold" style={{ background: 'rgba(245,158,11,0.12)', color: '#D97706' }}>{a}</span>
                          ))}
                        </div>
                      ) : <span className="text-sm" style={{ color: 'var(--sos-text-muted)' }}>Aucune signalée</span>}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm italic" style={{ color: 'var(--sos-text-muted)' }}>Profil médical non disponible</div>
                )}
              </div>

              {/* ICE Contact */}
              <div className="flex-1 p-6 rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-6 h-6 text-blue-400" />
                  <h3 className="text-blue-500 font-bold text-lg">Contact ICE</h3>
                </div>
                {medicalProfile?.iceContact && medicalProfile.iceContact.name ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm" style={{ color: 'var(--sos-text-secondary)' }}>Nom</div>
                      <div className="font-semibold text-lg" style={{ color: 'var(--sos-text-primary)' }}>{medicalProfile.iceContact.name}</div>
                    </div>
                    <div>
                      <div className="text-sm" style={{ color: 'var(--sos-text-secondary)' }}>Relation</div>
                      <div className="font-semibold text-lg capitalize" style={{ color: 'var(--sos-text-primary)' }}>{medicalProfile.iceContact.relation || 'Non précisé'}</div>
                    </div>
                    {medicalProfile.iceContact.phone && (
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--sos-border)' }}>
                        <a href={`tel:${medicalProfile.iceContact.phone}`} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all w-full" style={{ background: 'var(--sos-bg-hover)', border: '1px solid var(--sos-border)', color: 'var(--sos-text-primary)' }}>
                          <PhoneCall className="w-4 h-4" /> {medicalProfile.iceContact.phone}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm italic" style={{ color: 'var(--sos-text-muted)' }}>Aucun contact d&apos;urgence renseigné</div>
                )}
              </div>
            </div>

            {/* ── NEARBY WORKERS PANEL (Phase D) ─────────────────────────────── */}
            <AnimatePresence>
              {showNearby && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="rounded-xl border-2 overflow-hidden"
                  style={{ borderColor: 'rgba(245,158,11,0.5)', background: 'var(--sos-bg-surface-2)' }}
                >
                  <div className="flex items-center justify-between px-5 py-3" style={{ background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.3)' }}>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" style={{ color: '#F59E0B' }} />
                      <span className="font-bold text-sm" style={{ color: 'var(--sos-text-primary)' }}>
                        Travailleurs proches (≤ 500 m)
                      </span>
                    </div>
                    <button
                      onClick={handleFindNearby}
                      disabled={isLoadingNearby}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)' }}
                    >
                      {isLoadingNearby ? <Loader2 className="w-3 h-3 animate-spin" /> : '↻'} Actualiser
                    </button>
                  </div>

                  <div className="p-4">
                    {isLoadingNearby ? (
                      <div className="flex items-center justify-center gap-2 py-6" style={{ color: 'var(--sos-text-muted)' }}>
                        <Loader2 className="w-5 h-5 animate-spin" /> Recherche en cours...
                      </div>
                    ) : nearbyError ? (
                      <div className="text-sm text-center py-4" style={{ color: '#EF5350' }}>{nearbyError}</div>
                    ) : nearbyWorkers.length === 0 ? (
                      <div className="text-sm text-center py-4 italic" style={{ color: 'var(--sos-text-muted)' }}>
                        Aucun travailleur à proximité (GPS) ou dans la même unité.<br />
                        <span className="text-xs">Les travailleurs doivent avoir une urgence active dans l'entreprise pour partager leur GPS.</span>
                      </div>
                    ) : (
                      <>
                        {/* Worker list */}
                        <div className="space-y-2 mb-4">
                          {nearbyWorkers.map((w, i) => (
                            <div
                              key={w.id}
                              className="flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
                              style={{ background: 'var(--sos-bg-surface)', border: '1px solid var(--sos-border)' }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: i === 0 ? '#F59E0B' : 'rgba(245,158,11,0.4)' }}>
                                  {i + 1}
                                </div>
                                <div>
                                  <div className="font-semibold text-sm" style={{ color: 'var(--sos-text-primary)' }}>{w.full_name}</div>
                                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--sos-text-muted)' }}>
                                    {w.match_type === 'unit' ? (
                                      <>
                                        <Users className="w-3 h-3" /> Même unité
                                      </>
                                    ) : w.match_type === 'company' ? (
                                      <>
                                        <Users className="w-3 h-3" /> Même entreprise
                                      </>
                                    ) : (
                                      <>
                                        <Navigation className="w-3 h-3" />
                                        {w.distance_km?.toFixed(2)} km
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {w.phone ? (
                                  <a
                                    href={`tel:${w.phone}`}
                                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                    style={{ background: 'rgba(33,150,243,0.15)', border: '1px solid rgba(33,150,243,0.35)', color: '#2196F3' }}
                                  >
                                    <Phone className="w-3 h-3" /> Appeler
                                  </a>
                                ) : (
                                  <span className="text-xs italic" style={{ color: 'var(--sos-text-muted)' }}>Pas de tél.</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Mini map with nearby worker markers (only those with GPS) */}
                        {nearbyWorkers.filter(w => w.latitude != null && w.longitude != null).length > 0 && hasCoordinates && (
                          <div className="h-[220px] rounded-xl overflow-hidden border" style={{ borderColor: 'var(--sos-border)' }}>
                            <SOSMap
                              center={mapCenter}
                              zoom={13}
                              label={`Urgence: ${workerName}`}
                              extraMarkers={nearbyWorkers
                                .filter(w => w.latitude != null && w.longitude != null)
                                .map((w, i) => ({
                                  position: [w.latitude!, w.longitude!] as [number, number],
                                  label: `${i + 1}. ${w.full_name} (${w.distance_km?.toFixed(2)} km)`,
                                  color: 'blue',
                                }))}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Ping + Find Nearby (Moved Up) ──────────────────────── */}
            <div className="flex flex-wrap gap-3 items-center justify-start border-t pt-6" style={{ borderColor: 'var(--sos-border)' }}>
              <button
                onClick={handleSendPing}
                disabled={isSendingPing || pingCooldownLeft > 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.5)', color: '#F59E0B' }}
                title="Envoyer un signal au travailleur pour vérifier qu'il va bien"
              >
                <Bell className="w-5 h-5" />
                {pingCooldownLeft > 0
                  ? `Ping (${pingCooldownLeft}s)`
                  : isSendingPing ? 'Envoi...' : 'Envoyer un ping'}
              </button>

              {/* Ping status badge — shown after a ping is sent */}
              {currentEmergency.pingStatus === 'acked' && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold animate-pulse" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.5)', color: '#22c55e' }}>
                  <CheckCircle className="w-4 h-4" /> ✅ Travailleur a répondu — il va bien
                </div>
              )}
              {currentEmergency.pingStatus === 'sent' && pingCooldownLeft > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', color: '#F59E0B' }}>
                  <Bell className="w-4 h-4 animate-bounce" /> En attente de réponse...
                </div>
              )}

              <button
                onClick={handleFindNearby}
                disabled={isLoadingNearby}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-base transition-all"
                style={{ background: 'rgba(245,158,11,0.12)', border: '2px solid rgba(245,158,11,0.6)', color: '#F59E0B' }}
                title="Chercher des travailleurs proches avec GPS actif"
              >
                {isLoadingNearby
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Users className="w-5 h-5" />}
                Travailleurs proches
              </button>
            </div>

            {/* Resolution Form */}
            <div className="border-t pt-6" style={{ borderColor: 'var(--sos-border)' }}>
              <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--sos-text-primary)' }}>Détails de l&apos;intervention</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--sos-text-secondary)' }}>Intervenant</label>
                  <select
                    value={responderType || ''}
                    onChange={(e) => setResponderType(e.target.value as any)}
                    className="w-full p-2 border rounded"
                    style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)', color: 'var(--sos-text-primary)' }}
                  >
                    <option value="">-- Sélectionnez --</option>
                    <option value="police">Police / Gendarmerie</option>
                    <option value="samu">SAMU / Ambulance</option>
                    <option value="fire">Pompiers / Protection Civile</option>
                    <option value="other">Autre / Équipe interne</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--sos-text-secondary)' }}>Temps estimé (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 15"
                    value={etaMinutes}
                    onChange={(e) => setEtaMinutes(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full p-2 border rounded"
                    style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)', color: 'var(--sos-text-primary)' }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1" style={{ color: 'var(--sos-text-secondary)' }}>Notes (optionnel)</label>
                  <textarea
                    placeholder="Détails supplémentaires..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full p-2 border rounded"
                    rows={2}
                    style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)', color: 'var(--sos-text-primary)' }}
                  />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col gap-4 border-t pt-4" style={{ borderColor: 'var(--sos-border)' }}>

              {/* ── Row 1: Emergency service calls + worker call ──────────────── */}
              <div className="flex flex-wrap gap-3">
                <a href="tel:14" className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl font-bold transition-colors text-base shadow-lg shadow-orange-900/20">
                  <PhoneCall className="w-5 h-5" /> Pompiers (14)
                </a>
                <a href="tel:14" className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 rounded-xl font-bold transition-colors text-base shadow-lg shadow-blue-900/20">
                  <PhoneCall className="w-5 h-5" /> SAMU (14)
                </a>
                <a href="tel:17" className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white px-5 py-3 rounded-xl font-bold transition-colors text-base shadow-lg shadow-blue-900/20">
                  <PhoneCall className="w-5 h-5" /> Police (17)
                </a>
                <a href="tel:1055" className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold transition-colors text-base shadow-lg shadow-green-900/20">
                  <PhoneCall className="w-5 h-5" /> Gendarmerie (1055)
                </a>
                {/* Phase C: Direct call to worker */}
                {currentEmergency.workerPhone && (
                  <a
                    href={`tel:${currentEmergency.workerPhone}`}
                    className="flex items-center gap-2 text-white px-5 py-3 rounded-xl font-bold transition-colors text-base shadow-lg"
                    style={{ background: '#7C3AED', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}
                  >
                    <PhoneCall className="w-5 h-5" /> Appeler travailleur
                  </a>
                )}
              </div>

              {/* ── Row 2: Resolve ──────────────────────── */}
              <div className="flex flex-wrap gap-3 items-center justify-end mt-2">

                {/* Resolve button */}
                <button
                  onClick={handleResolve}
                  disabled={isResolving}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-colors w-full md:w-auto justify-center"
                >
                  {isResolving ? (
                    <span className="animate-pulse">Résolution...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6" />
                      Marquer comme résolue
                    </>
                  )}
                </button>
              </div>
            </div>

            </div>{/* end main content */}
          </div>{/* end flex body */}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
