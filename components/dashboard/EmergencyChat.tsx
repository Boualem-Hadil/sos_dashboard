import React, { useEffect, useState, useRef } from 'react';
import { getMessagesApi, sendTextMessageApi, sendVoiceMessageApi, getVoiceMessageUrl } from '@/lib/api';
import { getToken, getAuth } from '@/lib/auth';
import { Mic, Square, Send, Play, Pause, Loader2, Shield, User, Bot, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  emergency_id: string;
  sender_id: string | null;
  sender_role?: string;
  message_type: 'system' | 'text' | 'voice';
  content: string | null;
  file_url: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export function EmergencyChat({ emergencyId }: { emergencyId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const handleNewMessage = (e: any) => {
      const detail = e.detail;
      if (detail && detail.emergency_id === emergencyId && detail.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === detail.message.id)) return prev;
          return [...prev, detail.message];
        });
      }
    };

    window.addEventListener('sos_new_message', handleNewMessage);

    // Polling fallback every 5s if SSE drops
    const interval = setInterval(fetchMessages, 5000);

    return () => {
      window.removeEventListener('sos_new_message', handleNewMessage);
      clearInterval(interval);
    };
  }, [emergencyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await getMessagesApi(emergencyId, token);
      const msgs = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setMessages(msgs);
    } catch (e) {
      console.error('Failed to fetch messages', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setSending(true);
    try {
      const token = getToken();
      if (!token) return;
      await sendTextMessageApi(emergencyId, inputText.trim(), token);
      setInputText('');
      await fetchMessages();
    } catch (e) {
      console.error('Failed to send message', e);
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/m4a' });
        await sendAudioMessage(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      console.error('Microphone access denied', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const sendAudioMessage = async (blob: Blob) => {
    setSending(true);
    try {
      const token = getToken();
      if (!token) return;
      await sendVoiceMessageApi(emergencyId, blob, token);
      await fetchMessages();
    } catch (e) {
      console.error('Failed to send voice message', e);
    } finally {
      setSending(false);
    }
  };

  const playAudio = (fileId: string) => {
    const token = getToken();
    if (!token) return;
    
    if (playingAudioId === fileId && audioRef.current) {
      audioRef.current.pause();
      setPlayingAudioId(null);
      return;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    import('@/lib/api').then(async ({ fetchAudioBlobUrl }) => {
      try {
        const blobUrl = await fetchAudioBlobUrl(emergencyId, fileId, token);
        const audio = new Audio(blobUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setPlayingAudioId(null);
          URL.revokeObjectURL(blobUrl);
        };
        
        audio.play();
        setPlayingAudioId(fileId);
      } catch (err) {
        console.error('Cannot play audio', err);
      }
    });
  };

  // Filter out any legacy location messages from appearing in the chat flow
  const filteredMessages = messages.filter(
    (m) => !m.content?.includes('Emergency triggered at location:')
  );

  return (
    <div className="flex flex-col min-h-0 h-full rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--sos-border)' }}>
        <div className="font-bold flex items-center gap-2">
          <span>Discussion d'Urgence</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium" style={{ color: 'var(--sos-text-muted)' }}>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> Officier
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Travailleur
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span> IA
          </span>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 min-h-0 p-4 overflow-y-auto flex flex-col gap-3.5">
        {loading ? (
          <div className="text-center text-sm py-4" style={{ color: 'var(--sos-text-muted)' }}>Chargement des messages...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center text-sm py-8 italic" style={{ color: 'var(--sos-text-muted)' }}>
            Aucun message pour le moment.
            <div className="text-xs mt-1">Vous pouvez communiquer directement avec le travailleur ci-dessous.</div>
          </div>
        ) : (
          filteredMessages.map((m) => {
            const isSystem = m.sender_role === 'system' || m.message_type === 'system';
            const isOfficer = m.sender_role === 'safety_officer' || m.sender_role === 'company_admin' || m.sender_role === 'super_admin';
            const isAI = m.sender_role === 'ai_assistant';
            const isWorker = !isOfficer && !isAI && !isSystem;

            // System Message (Centered pill)
            if (isSystem) {
              return (
                <div key={m.id} className="mx-auto text-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs max-w-[90%] rounded-full px-4 py-1.5 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="font-medium">{m.content}</span>
                </div>
              );
            }

            // Safety Officer (RIGHT SIDE — Blue Theme)
            if (isOfficer) {
              return (
                <div key={m.id} className="ml-auto max-w-[85%] flex flex-col items-end">
                  <div className="flex items-center gap-1 mb-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Officier de Sécurité (Vous)</span>
                  </div>
                  <div className="rounded-2xl rounded-tr-xs p-3.5 bg-blue-600 text-white shadow-sm border border-blue-500/80">
                    {m.message_type === 'text' && (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                    )}
                    {m.message_type === 'voice' && m.file_url && (
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => playAudio(m.file_url!.split('/').pop()!)}
                          className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-blue-600 hover:bg-blue-50 shadow-xs transition-colors"
                        >
                          {playingAudioId === m.file_url!.split('/').pop() ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                        <div className="text-xs font-semibold text-blue-100">
                          Message Vocal ({m.duration_seconds || 0}s)
                        </div>
                      </div>
                    )}
                    <div className="text-[10px] text-blue-200 text-right mt-1.5">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            }

            // AI Assistant (LEFT SIDE — Purple Theme)
            if (isAI) {
              return (
                <div key={m.id} className="mr-auto max-w-[85%] flex flex-col items-start">
                  <div className="flex items-center gap-1 mb-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Assistant Vocal IA</span>
                  </div>
                  <div className="rounded-2xl rounded-tl-xs p-3.5 bg-purple-50 dark:bg-purple-950/40 text-slate-800 dark:text-purple-100 border border-purple-200 dark:border-purple-800/60 shadow-sm">
                    {m.message_type === 'text' && (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                    )}
                    {m.message_type === 'voice' && m.file_url && (
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => playAudio(m.file_url!.split('/').pop()!)}
                          className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-600 text-white hover:bg-purple-700 shadow-xs transition-colors"
                        >
                          {playingAudioId === m.file_url!.split('/').pop() ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                        <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                          Message Vocal ({m.duration_seconds || 0}s)
                        </div>
                      </div>
                    )}
                    <div className="text-[10px] text-purple-600/70 dark:text-purple-400 text-left mt-1.5">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            }

            // Worker (LEFT SIDE — Warm Amber Theme)
            return (
              <div key={m.id} className="mr-auto max-w-[85%] flex flex-col items-start">
                <div className="flex items-center gap-1 mb-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  <User className="w-3.5 h-3.5" />
                  <span>Travailleur (Victime)</span>
                </div>
                <div className="rounded-2xl rounded-tl-xs p-3.5 bg-amber-50 dark:bg-amber-950/40 text-slate-800 dark:text-amber-100 border border-amber-300 dark:border-amber-700/60 shadow-sm">
                  {m.message_type === 'text' && (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                  )}
                  {m.message_type === 'voice' && m.file_url && (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => playAudio(m.file_url!.split('/').pop()!)}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-600 text-white hover:bg-amber-700 shadow-xs transition-colors"
                      >
                        {playingAudioId === m.file_url!.split('/').pop() ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                      <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        Message Vocal ({m.duration_seconds || 0}s)
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] text-amber-700/70 dark:text-amber-400 text-left mt-1.5">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t bg-white dark:bg-slate-900 flex items-center gap-2 rounded-b-xl" style={{ borderColor: 'var(--sos-border)' }}>
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between px-4 py-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-sm font-semibold">Enregistrement... 00:{recordingTime.toString().padStart(2, '0')}</span>
            </div>
            <button onClick={stopRecording} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors" title="Arrêter l'enregistrement">
              <Square className="w-5 h-5 text-red-600" fill="currentColor" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendText} className="flex-1 flex items-center gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Écrire à l'employé..."
              className="flex-1 px-4 py-2 rounded-lg text-sm border outline-none transition-colors focus:border-blue-500"
              style={{ background: 'var(--sos-bg-surface)', borderColor: 'var(--sos-border)' }}
            />
            {inputText.trim() ? (
              <button 
                type="submit" 
                disabled={sending}
                className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
                title="Envoyer"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            ) : (
              <button 
                type="button" 
                onClick={startRecording}
                className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                title="Enregistrer un message vocal"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
