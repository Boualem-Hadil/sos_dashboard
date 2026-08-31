import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmergency } from '@/context/EmergencyContext';
import { resolveEmergencyApi, sendPingApi, getNearbyWorkersApi } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { PhoneCall, MapPin, AlertTriangle, HeartPulse, Volume2, VolumeX, CheckCircle, ShieldAlert, Phone, Map as MapIcon, X, Bell, Users, Loader2, Navigation } from 'lucide-react';
import dynamic from 'next/dynamic';
import { EmergencyChat } from '@/components/dashboard/EmergencyChat';
import type { NearbyWorker } from '@/types';

const SOSMap = dynamic(() => import('@/components/dashboard/Map'), { ssr: false, loading: () => <div className="w-full h-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center">Chargement carte...</div> });

const PING_WINDOW_MS = 60_000;

export function EmergencyModal() {
  const { status, currentEmergency, resolveEmergency, resolveEmergencyById, resolveEmergencyWithData, addToast, dismissedEmergencyIds, dismissEmergencyModal, activeEmergencies, selectedEmergencyId, selectEmergency } = useEmergency();
  
  const [isMuted, setIsMuted] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [activeTab, setActiveTab] = useState<'gps' | 'medical' | 'nearby' | 'resolution'>('gps');
  
  // Resolution fields
  const [responderType, setResponderType] = useState<'police' | 'samu' | 'fire' | 'other' | undefined>();
  const [etaMinutes, setEtaMinutes] = useState<number | ''>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const singleBeepRef = useRef<NodeJS.Timeout | null>(null);
  const multiBeepRef = useRef<NodeJS.Timeout | null>(null);

  // Ping state
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [pingCooldownLeft, setPingCooldownLeft] = useState(0);
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Nearby workers state
  const [nearbyWorkers, setNearbyWorkers] = useState<NearbyWorker[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const multiMode = activeEmergencies.length > 1;

  // Reset states when empty
  useEffect(() => {
    if (activeEmergencies.length === 0) {
      setIsMuted(false);
      setResponderType(undefined);
      setEtaMinutes('');
      setResolutionNotes('');
      setNearbyWorkers([]);
    }
  }, [activeEmergencies.length]);

  // Reset per-emergency UI state
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedEmergencyId !== prevSelectedRef.current) {
      prevSelectedRef.current = selectedEmergencyId;
      setNearbyWorkers([]);
      setNearbyError(null);
      setPingCooldownLeft(0);
      setResponderType(undefined);
      setEtaMinutes('');
      setResolutionNotes('');
      setActiveTab('gps');
    }
  }, [selectedEmergencyId]);

  // Not-responding poll
  const notRespondingRef = useRef(false);
  const notRespondingTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (currentEmergency?.pingStatus === 'sent' && !notRespondingRef.current) {
      notRespondingRef.current = true;
      notRespondingTimer.current = setTimeout(() => {
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

  // Ping cooldown
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

  // Audio System
  useEffect(() => {
    if (status !== 'active' || !currentEmergency || isMuted || dismissedEmergencyIds.includes(currentEmergency.id)) {
      if (singleBeepRef.current) clearInterval(singleBeepRef.current);
      if (multiBeepRef.current) clearInterval(multiBeepRef.current);
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const playBeep = (freq: number, duration: number, double: boolean = false) => {
      if (!audioCtxRef.current) return;
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      
      const offsets = double ? [0, 0.18] : [0];
      offsets.forEach((offset) => {
        const osc = audioCtxRef.current!.createOscillator();
        const gainNode = audioCtxRef.current!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtxRef.current!.currentTime + offset);
        gainNode.gain.setValueAtTime(0, audioCtxRef.current!.currentTime + offset);
        gainNode.gain.linearRampToValueAtTime(1, audioCtxRef.current!.currentTime + offset + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtxRef.current!.currentTime + offset + duration);
        osc.connect(gainNode);
        gainNode.connect(audioCtxRef.current!.destination);
        osc.start(audioCtxRef.current!.currentTime + offset);
        osc.stop(audioCtxRef.current!.currentTime + offset + duration);
      });
    };

    if (multiMode) {
      if (singleBeepRef.current) clearInterval(singleBeepRef.current);
      playBeep(1200, 0.18, true);
      multiBeepRef.current = setInterval(() => playBeep(1200, 0.18, true), 20000);
    } else {
      if (multiBeepRef.current) clearInterval(multiBeepRef.current);
      playBeep(880, 0.3, false);
      singleBeepRef.current = setInterval(() => playBeep(880, 0.3, false), 1000);
    }

    return () => {
      if (singleBeepRef.current) clearInterval(singleBeepRef.current);
      if (multiBeepRef.current) clearInterval(multiBeepRef.current);
    };
  }, [status, currentEmergency, isMuted, dismissedEmergencyIds, multiMode]);

  if (status !== 'active' || !currentEmergency || dismissedEmergencyIds.includes(currentEmergency.id)) return null;

  const handleResolve = async () => {
    const emergencyId = currentEmergency.id;
    setIsResolving(true);
    try {
      const token = getToken();
      if (!token) throw new Error("No token");
      await resolveEmergencyApi(
        emergencyId, 
        'resolved', 
        token, 
        responderType, 
        etaMinutes === '' ? undefined : Number(etaMinutes), 
        resolutionNotes || undefined
      );
      resolveEmergencyById(emergencyId);
      if (resolveEmergencyWithData) {
        resolveEmergencyWithData({
          ...currentEmergency,
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
          notes: resolutionNotes || currentEmergency.notes,
          responderType,
          etaMinutes: etaMinutes === '' ? undefined : Number(etaMinutes),
        });
      }
      setResponderType(undefined);
      setEtaMinutes('');
      setResolutionNotes('');
      addToast({ type: 'success', title: 'Urgence résolue', message: 'La situation a été marquée comme résolue.' });
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erreur', message: "Impossible de résoudre l'urgence." });
    } finally {
      setIsResolving(false);
    }
  };

  const handleSendPing = async () => {
    if (isSendingPing || pingCooldownLeft > 0) return;
    setIsSendingPing(true);
    try {
      const token = getToken();
      if (!token) throw new Error('No token');
      await sendPingApi(currentEmergency.id, token);
      addToast({ type: 'info', title: 'Ping envoyé', message: 'Le travailleur a 60 secondes pour répondre.' });
      setPingCooldownLeft(10);
    } catch {
      addToast({ type: 'error', title: 'Erreur', message: "Impossible d'envoyer le ping." });
    } finally {
      setIsSendingPing(false);
    }
  };

  const handleFindNearby = async () => {
    setActiveTab('nearby');
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
    : hasCoordinates
      ? [apiLat, apiLng]
      : [0, 0];

  const isNotResponding = currentEmergency.notResponding === true;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans"
      >
        <motion.div animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-red-600/20" />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-7xl border-2 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] bg-slate-50"
          style={{ borderColor: '#E53935' }}
        >
          {/* Header */}
          <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white sticky top-0 z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
              <h2 className="text-xl md:text-2xl font-bold tracking-wider uppercase">Urgence Détectée</h2>
              {multiMode && (
                <span className="ml-3 text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
                  {activeEmergencies.length} actives
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button onClick={() => dismissEmergencyModal(currentEmergency.id)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors ml-1" title="Fermer la vue">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar (Multi) */}
            {multiMode && (
              <div className="w-64 flex-shrink-0 border-r bg-white overflow-y-auto">
                <div className="px-4 py-3 text-sm font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b">Urgences actives</div>
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
                        background: isSelected ? 'rgba(239,68,68,0.08)' : 'transparent',
                        borderLeft: isSelected ? '4px solid #ef4444' : '4px solid transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: severityColor }} />
                        <span className="text-sm font-bold truncate text-slate-900">{e.workerName}</span>
                      </div>
                      <div className="text-sm capitalize font-medium text-slate-600">{e.type}</div>
                      <div className="text-xs mt-0.5 text-slate-500">{elapsedMin} min</div>
                      {hasDuplicate && <div className="mt-1.5 text-xs font-bold text-amber-500">⚠️ Doublon possible</div>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Not Responding Alert */}
              <AnimatePresence>
                {isNotResponding && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-orange-500 text-white px-6 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-6 h-6 animate-bounce" />
                      <div>
                        <p className="font-bold uppercase tracking-widest text-sm">Travailleur ne répond pas</p>
                        <p className="text-xs font-medium opacity-90">Le travailleur n'a pas répondu au ping. Appelez les travailleurs proches.</p>
                      </div>
                    </div>
                    <button onClick={handleFindNearby} className="bg-white text-orange-600 px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-orange-50 transition-colors flex items-center gap-2">
                      <Users className="w-4 h-4" /> Chercher proches
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bande critique */}
              <div className="bg-red-50 border-b-2 border-red-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xl font-black text-slate-900 tracking-tight">{workerName}</span>
                    <span className="text-xs font-bold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-md uppercase tracking-wider border border-slate-300">
                      {currentEmergency.workerBadge || 'Badge inconnu'}
                    </span>
                    {currentEmergency.workerPhone && (
                      <a href={`tel:${currentEmergency.workerPhone}`} className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1 rounded-md font-bold text-xs shadow-sm transition-colors">
                        <Phone className="w-3.5 h-3.5" /> {currentEmergency.workerPhone}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="font-semibold">{location}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-xs uppercase font-black text-slate-400 tracking-wider mb-1">Situation</span>
                    <span className="font-black capitalize text-red-600 text-lg">{type}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <a href="tel:14" className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg font-bold text-xs shadow-sm"><PhoneCall className="w-3.5 h-3.5" /> 14</a>
                  <a href="tel:15" className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-xs shadow-sm"><PhoneCall className="w-3.5 h-3.5" /> 15</a>
                  <a href="tel:17" className="flex items-center gap-1.5 bg-blue-800 hover:bg-blue-900 text-white px-3 py-2 rounded-lg font-bold text-xs shadow-sm"><PhoneCall className="w-3.5 h-3.5" /> 17</a>
                  
                  {/* PING & PROXIMITY BUTTONS */}
                  <div className="ml-2 pl-2 border-l-2 border-red-200 flex items-center gap-2">
                    <button onClick={handleSendPing} disabled={isSendingPing || pingCooldownLeft > 0} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-bold text-xs shadow-sm transition-colors" title="Envoyer un signal au travailleur">
                      <Bell className="w-3.5 h-3.5" />
                      {pingCooldownLeft > 0 ? `Ping (${pingCooldownLeft}s)` : currentEmergency.pingStatus === 'acked' ? '✓ OK' : 'Ping'}
                    </button>
                    <button onClick={handleFindNearby} disabled={isLoadingNearby} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-bold text-xs shadow-sm transition-colors" title="Chercher travailleurs proches">
                      {isLoadingNearby ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                      Proximité
                    </button>
                  </div>
                </div>
              </div>

              {/* 2-Column Layout */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1 bg-slate-100">
                {/* Left Column: Chat */}
                <div className="lg:col-span-7 flex flex-col h-full min-h-[400px]">
                  <div className="flex-1 min-h-[400px] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <EmergencyChat emergencyId={currentEmergency.id} />
                  </div>
                </div>

                {/* Right Column: Tabs */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  {/* Tab Navigation */}
                  <div className="flex bg-slate-200 p-1.5 rounded-xl shadow-inner">
                    <button onClick={() => setActiveTab('gps')} className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'gps' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>
                      <MapPin className="w-4 h-4 mx-auto mb-1" /> Carte
                    </button>
                    <button onClick={() => setActiveTab('medical')} className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'medical' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-600 hover:text-slate-900'}`}>
                      <HeartPulse className="w-4 h-4 mx-auto mb-1" /> Profil
                    </button>
                    <button onClick={() => setActiveTab('nearby')} className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'nearby' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-600 hover:text-slate-900'}`}>
                      <Users className="w-4 h-4 mx-auto mb-1" /> Proches
                    </button>
                    <button onClick={() => setActiveTab('resolution')} className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'resolution' ? 'bg-white shadow-sm text-green-600' : 'text-slate-600 hover:text-slate-900'}`}>
                      <CheckCircle className="w-4 h-4 mx-auto mb-1" /> Finir
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
                    
                    {/* CARTE / GPS TAB */}
                    {activeTab === 'gps' && (
                      <div className="h-full flex flex-col relative">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                            <MapIcon className="w-4 h-4 text-blue-500" /> Position
                          </h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleFindNearby}
                              disabled={isLoadingNearby}
                              className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md flex items-center gap-1 hover:bg-amber-200 transition-colors"
                              title="Rechercher les collègues proches"
                            >
                              {isLoadingNearby ? <Loader2 className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
                              Proches ({nearbyWorkers.length})
                            </button>
                            <span className="text-xs font-mono text-slate-500 bg-slate-200 px-2 py-1 rounded">
                              {hasCoordinates ? `${Number(mapCenter[0]).toFixed(5)}, ${Number(mapCenter[1]).toFixed(5)}` : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 relative">
                          {hasCoordinates ? (
                            <SOSMap 
                              center={mapCenter} 
                              zoom={15} 
                              label={`Urgence: ${workerName}`}
                              extraMarkers={nearbyWorkers
                                .filter(w => w.latitude != null && w.longitude != null)
                                .map(w => ({
                                  position: [w.latitude!, w.longitude!],
                                  label: `${w.full_name} (${w.distance_km != null ? `${w.distance_km.toFixed(1)} km` : ''})`,
                                  color: 'blue' as const,
                                }))}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-400 italic">
                              Coordonnées GPS indisponibles.
                            </div>
                          )}

                          {/* Panneau travailleurs proches dans l'onglet Carte */}
                          {nearbyWorkers.length > 0 && (
                            <div className="absolute bottom-3 left-3 right-3 z-[400] max-h-44 bg-white/95 backdrop-blur-sm border border-amber-300 rounded-xl p-3 shadow-lg overflow-y-auto">
                              <div className="text-xs font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Collègues à proximité ({nearbyWorkers.length})</span>
                                <span className="text-[10px] text-slate-500 font-normal">Affichés en bleu sur la carte</span>
                              </div>
                              <div className="space-y-1.5">
                                {nearbyWorkers.map(w => (
                                  <div key={w.id} className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                                    <span className="font-bold text-slate-800 truncate">{w.full_name}</span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-slate-500 font-medium">{w.distance_km != null ? `${w.distance_km.toFixed(2)} km` : ''}</span>
                                      {w.phone && (
                                        <a href={`tel:${w.phone}`} className="text-blue-600 hover:text-blue-800 font-bold p-1 bg-blue-50 rounded">
                                          <Phone className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* MEDICAL TAB */}
                    {activeTab === 'medical' && (
                      <div className="p-5 flex flex-col gap-6 flex-1 overflow-y-auto">
                        <div>
                          <h3 className="font-black text-pink-600 flex items-center gap-2 mb-4 uppercase tracking-wider text-sm">
                            <HeartPulse className="w-5 h-5" /> Profil Médical
                          </h3>
                          {medicalProfile ? (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-slate-500 font-bold text-sm uppercase tracking-wider">Groupe Sanguin</span>
                                <span className="font-black text-red-600 text-2xl">{medicalProfile.bloodType}</span>
                              </div>
                              <div>
                                <span className="block mb-2 text-slate-500 font-bold text-sm uppercase tracking-wider">Allergies</span>
                                {medicalProfile.allergies?.length ? (
                                  <div className="flex flex-wrap gap-2">
                                    {medicalProfile.allergies.map((a: string, i: number) => (
                                      <span key={i} className="px-3 py-1.5 text-xs rounded-lg font-bold bg-red-50 text-red-600 border border-red-100">{a}</span>
                                    ))}
                                  </div>
                                ) : <span className="text-slate-400 italic text-sm">Aucune</span>}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm italic text-slate-400 p-6 bg-slate-50 rounded-xl border border-slate-100 text-center">Non renseigné</div>
                          )}
                        </div>
                        <hr className="border-slate-100" />
                        <div>
                          <h3 className="font-black text-blue-600 flex items-center gap-2 mb-4 uppercase tracking-wider text-sm">
                            <Phone className="w-5 h-5" /> Contact ICE
                          </h3>
                          {medicalProfile?.iceContact?.name ? (
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                              <div className="font-black text-slate-900 text-lg mb-1">{medicalProfile.iceContact.name}</div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{medicalProfile.iceContact.relation || 'Contact'}</div>
                              {medicalProfile.iceContact.phone && (
                                <a href={`tel:${medicalProfile.iceContact.phone}`} className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
                                  <PhoneCall className="w-4 h-4" /> Appeler {medicalProfile.iceContact.phone}
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm italic text-slate-400 p-6 bg-slate-50 rounded-xl border border-slate-100 text-center">Aucun contact ICE</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* NEARBY TAB */}
                    {activeTab === 'nearby' && (
                      <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                          <h3 className="font-black text-amber-600 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Users className="w-4 h-4" /> Proches
                          </h3>
                          <button onClick={handleFindNearby} disabled={isLoadingNearby} className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-amber-200 transition-colors">
                            {isLoadingNearby ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Actualiser'}
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                          {isLoadingNearby ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
                          ) : nearbyError ? (
                            <div className="text-sm text-red-500 text-center py-4 font-semibold">{nearbyError}</div>
                          ) : nearbyWorkers.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-slate-500 font-medium text-sm">Aucun collègue à proximité.</p>
                              <button onClick={handleFindNearby} className="mt-4 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg shadow-sm">Lancer la recherche</button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {nearbyWorkers.map((w, i) => (
                                <div key={w.id} className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between shadow-sm">
                                  <div>
                                    <div className="font-bold text-slate-900 text-sm">{w.full_name}</div>
                                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                      <Navigation className="w-3 h-3 text-amber-500" /> {w.distance_km?.toFixed(2)} km
                                    </div>
                                  </div>
                                  {w.phone && (
                                    <a href={`tel:${w.phone}`} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                      <Phone className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* RESOLUTION TAB */}
                    {activeTab === 'resolution' && (
                      <div className="p-5 h-full flex flex-col justify-between">
                        <div>
                          <h3 className="font-black text-green-600 flex items-center gap-2 mb-6 uppercase tracking-wider text-sm">
                            <CheckCircle className="w-5 h-5" /> Résolution
                          </h3>
                          <div className="space-y-5">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Intervenant</label>
                              <select value={responderType || ''} onChange={(e) => setResponderType(e.target.value as any)} className="w-full p-3 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none transition-shadow">
                                <option value="">-- Sélectionnez --</option>
                                <option value="police">Police / Gendarmerie</option>
                                <option value="samu">SAMU / Ambulance</option>
                                <option value="fire">Pompiers</option>
                                <option value="other">Autre</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Temps estimé (min)</label>
                              <input type="number" min="0" placeholder="Ex: 15" value={etaMinutes} onChange={(e) => setEtaMinutes(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full p-3 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none transition-shadow" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
                              <textarea placeholder="Détails..." value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} className="w-full p-3 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none resize-none transition-shadow" rows={3} />
                            </div>
                          </div>
                        </div>

                        <button onClick={handleResolve} disabled={isResolving} className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-colors shadow-sm mt-6">
                          {isResolving ? <span className="animate-pulse">Traitement...</span> : <><CheckCircle className="w-5 h-5" /> Résoudre</>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
