import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmergency } from '@/context/EmergencyContext';
import { resolveEmergencyApi } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { PhoneCall, MapPin, AlertTriangle, HeartPulse, Volume2, VolumeX, CheckCircle, ShieldAlert, Phone } from 'lucide-react';

export function EmergencyModal() {
  const { status, currentEmergency, resolveEmergency, addToast } = useEmergency();
  const [isMuted, setIsMuted] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio API for beeping
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
        oscillator.frequency.setValueAtTime(880, audioCtxRef.current!.currentTime); // A5
        
        gainNode.gain.setValueAtTime(0, audioCtxRef.current!.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, audioCtxRef.current!.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtxRef.current!.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtxRef.current!.destination);
        
        oscillator.start();
        oscillator.stop(audioCtxRef.current!.currentTime + 0.3);
      };

      // Play initially and then every 1 second
      playBeep();
      intervalRef.current = setInterval(playBeep, 1000);

    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, currentEmergency, isMuted]);

  if (status !== 'active' || !currentEmergency) return null;

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      const token = getToken();
      if (!token) throw new Error("No token");
      await resolveEmergencyApi(currentEmergency.id, 'resolved', token);
      resolveEmergency();
      addToast({
        type: 'success',
        title: 'Urgence résolue',
        message: 'La situation a été marquée comme résolue.'
      });
    } catch (error) {
      console.error(error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de résoudre l\'urgence.'
      });
    } finally {
      setIsResolving(false);
    }
  };

  const { type, severity, workerName, location, medicalProfile } = currentEmergency;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        {/* Pulsing background effect */}
        <motion.div
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute inset-0 bg-red-600/20"
        />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-3xl bg-neutral-900 border-2 border-red-500 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
              <h2 className="text-2xl font-bold tracking-wider uppercase">Urgence Détectée</h2>
            </div>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white"
              title={isMuted ? "Activer le son" : "Désactiver le son"}
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
          </div>

          <div className="p-6 md:p-8 flex flex-col gap-8">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 flex flex-col">
                <span className="text-neutral-400 text-sm font-semibold uppercase mb-1">Employé</span>
                <span className="text-white text-xl font-bold">{workerName}</span>
              </div>
              <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 flex flex-col">
                <span className="text-neutral-400 text-sm font-semibold uppercase mb-1">Localisation</span>
                <div className="flex items-center gap-2 text-white">
                  <MapPin className="w-5 h-5 text-red-400" />
                  <span className="text-xl font-bold">{location}</span>
                </div>
              </div>
            </div>

            {/* Emergency Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-2">
              {/* Left Column: Situation */}
              <div className="flex-1 bg-red-950/30 p-6 rounded-xl border border-red-900/50">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h3 className="text-red-400 font-bold text-lg">Situation</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-neutral-400 text-sm">Type</div>
                    <div className="text-white font-semibold text-lg capitalize">{type}</div>
                  </div>
                  <div>
                    <div className="text-neutral-400 text-sm">Sévérité</div>
                    <div className="text-white font-semibold text-lg capitalize">
                      {severity === 'critical' ? '🔴 Critique' : severity === 'high' ? '🟠 Élevée' : severity === 'moderate' ? '🟡 Modérée' : '🔵 Faible'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column: Medical Profile */}
              <div className="flex-1 bg-neutral-800 p-6 rounded-xl border border-neutral-700">
                <div className="flex items-center gap-2 mb-4">
                  <HeartPulse className="w-6 h-6 text-pink-500" />
                  <h3 className="text-pink-400 font-bold text-lg">Profil Médical</h3>
                </div>
                {medicalProfile ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-neutral-900 p-2 rounded">
                      <span className="text-neutral-400 text-sm">Groupe Sanguin</span>
                      <span className="text-white font-bold text-red-400">{medicalProfile.bloodType}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-sm block mb-1">Allergies</span>
                      {medicalProfile.allergies && medicalProfile.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {medicalProfile.allergies.map((a: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-red-900/40 text-red-300 text-xs rounded-md">{a}</span>
                          ))}
                        </div>
                      ) : <span className="text-neutral-500 text-sm">Aucune connue</span>}
                    </div>
                    <div>
                      <span className="text-neutral-400 text-sm block mb-1">Maladies Chroniques</span>
                      {medicalProfile.chronicDiseases && medicalProfile.chronicDiseases.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {medicalProfile.chronicDiseases.map((a: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-orange-900/40 text-orange-300 text-xs rounded-md">{a}</span>
                          ))}
                        </div>
                      ) : <span className="text-neutral-500 text-sm">Aucune signalée</span>}
                    </div>
                  </div>
                ) : (
                  <div className="text-neutral-500 text-sm italic">Profil médical non disponible</div>
                )}
              </div>

              {/* Right Column: ICE Contact */}
              <div className="flex-1 bg-neutral-800 p-6 rounded-xl border border-neutral-700">
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-6 h-6 text-blue-400" />
                  <h3 className="text-blue-400 font-bold text-lg">Contact ICE</h3>
                </div>
                {medicalProfile?.iceContact && medicalProfile.iceContact.name ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-neutral-400 text-sm">Nom</div>
                      <div className="text-white font-semibold text-lg">{medicalProfile.iceContact.name}</div>
                    </div>
                    <div>
                      <div className="text-neutral-400 text-sm">Relation</div>
                      <div className="text-white font-semibold text-lg capitalize">{medicalProfile.iceContact.relation || 'Non précisé'}</div>
                    </div>
                    {medicalProfile.iceContact.phone && (
                      <div className="mt-4 pt-4 border-t border-neutral-700">
                        <a href={`tel:${medicalProfile.iceContact.phone}`} className="flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-lg font-bold transition-colors w-full">
                          <PhoneCall className="w-4 h-4" /> {medicalProfile.iceContact.phone}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-neutral-500 text-sm italic">Aucun contact d'urgence renseigné</div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between border-t border-neutral-800 pt-6">
              <div className="flex flex-wrap gap-3 w-full md:w-auto justify-center md:justify-start">
                <a href="tel:14" className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg font-bold transition-colors text-sm shadow-lg shadow-orange-900/20">
                  <PhoneCall className="w-4 h-4" /> Pompiers (14)
                </a>
                <a href="tel:15" className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-bold transition-colors text-sm shadow-lg shadow-blue-900/20">
                  <PhoneCall className="w-4 h-4" /> SAMU (15)
                </a>
                <a href="tel:17" className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white px-3 py-2 rounded-lg font-bold transition-colors text-sm shadow-lg shadow-blue-900/20">
                  <PhoneCall className="w-4 h-4" /> Police (17)
                </a>
                <a href="tel:1055" className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg font-bold transition-colors text-sm shadow-lg shadow-green-900/20">
                  <PhoneCall className="w-4 h-4" /> Gendarmerie (1055)
                </a>
              </div>

              <button
                onClick={handleResolve}
                disabled={isResolving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-colors w-full md:w-auto justify-center"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
