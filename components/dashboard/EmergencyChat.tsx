import React, { useEffect, useState, useRef } from 'react';
import { getMessagesApi, sendTextMessageApi, sendVoiceMessageApi, getVoiceMessageUrl } from '@/lib/api';
import { getToken, getAuth } from '@/lib/auth';
import { Mic, Square, Send, Play, Pause, Loader2 } from 'lucide-react';

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
  const currentUserId = getAuth()?.employeeId; // Actually we only have employeeId in AuthUser, but the DB uses UUID. 
  // Let's just assume we can't perfectly distinguish "me" visually if we don't have the UUID, or we just rely on sender_id.
  // We'll style it simply.

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
      // Defensive: API wraps response in { data: [...] }
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/m4a' }); // or audio/webm
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
    
    const audioUrl = getVoiceMessageUrl(emergencyId, fileId, token);
    
    // Create new audio element with auth workaround if needed, 
    // For standard <audio> tag we might need fetch Blob first if CORS/Auth blocks it.
    // Let's use the fetchBlob workaround.
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

  return (
    <div className="flex flex-col h-full rounded-xl border" style={{ background: 'var(--sos-bg-surface-2)', borderColor: 'var(--sos-border)' }}>
      <div className="p-3 border-b font-bold" style={{ borderColor: 'var(--sos-border)' }}>
        Chat d'Urgence
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 min-h-[300px] max-h-[400px]">
        {loading ? (
          <div className="text-center text-sm" style={{ color: 'var(--sos-text-muted)' }}>Chargement des messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm italic" style={{ color: 'var(--sos-text-muted)' }}>Aucun message.</div>
        ) : (
          messages.map((m) => {
            const isSystem = m.sender_role === 'system' || m.message_type === 'system';
            const isWorker = m.sender_role === 'worker' || (!m.sender_role && m.sender_id && m.sender_id !== currentUserId);
            const isOfficer = m.sender_role === 'safety_officer' || (!m.sender_role && m.sender_id === currentUserId);
            const isAI = m.sender_role === 'ai_assistant';

            if (isSystem) {
              return (
                <div key={m.id} className="mx-auto text-center bg-gray-100 text-gray-800 text-xs w-full max-w-[95%] rounded-xl p-3">
                  <div className="font-semibold">{m.content}</div>
                </div>
              );
            }

            let containerClass = "flex flex-col max-w-[85%] rounded-xl p-3 ";
            let textClass = "text-sm";
            let timeClass = "text-[10px] mt-1 ";

            if (isOfficer) {
              containerClass += "bg-blue-600 text-white ml-auto rounded-tr-none";
              timeClass += "text-blue-200 text-right";
            } else if (isAI) {
              containerClass += "bg-gray-800 text-white mr-auto rounded-tl-none";
              timeClass += "text-gray-400 text-left";
            } else {
              containerClass += "bg-gray-100 text-gray-900 border border-gray-200 mr-auto rounded-tl-none";
              timeClass += "text-gray-500 text-left";
            }

            return (
              <div key={m.id} className={containerClass}>
                {isAI && (
                  <div className="flex items-center gap-1 mb-1">
                    <span className="bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">IA Assistante</span>
                  </div>
                )}
                {isWorker && (
                  <div className="flex items-center gap-1 mb-1">
                    <span className="bg-gray-300 text-gray-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Employé</span>
                  </div>
                )}
                {isOfficer && (
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <span className="bg-blue-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Officier de Sécurité</span>
                  </div>
                )}

                {m.message_type === 'text' && (
                  <div className={textClass}>{m.content}</div>
                )}
                {m.message_type === 'voice' && m.file_url && (
                  <div className="flex items-center gap-2 mt-1">
                    <button 
                      onClick={() => playAudio(m.file_url!.split('/').pop()!)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${isOfficer ? 'bg-white text-blue-600 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      {playingAudioId === m.file_url!.split('/').pop() ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <div className="text-xs font-semibold opacity-90">
                      Vocal ({m.duration_seconds}s)
                    </div>
                  </div>
                )}
                <div className={timeClass}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t bg-white flex items-center gap-2" style={{ borderColor: 'var(--sos-border)' }}>
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between px-4 py-2 bg-red-50 rounded-lg border border-red-100 text-red-600 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-sm font-semibold">Enregistrement... 00:{recordingTime.toString().padStart(2, '0')}</span>
            </div>
            <button onClick={stopRecording} className="p-1 hover:bg-red-100 rounded">
              <Square className="w-5 h-5 text-red-600" fill="currentColor" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendText} className="flex-1 flex items-center gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tapez un message..."
              className="flex-1 px-4 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--sos-bg-surface)', borderColor: 'var(--sos-border)' }}
            />
            {inputText.trim() ? (
              <button 
                type="submit" 
                disabled={sending}
                className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            ) : (
              <button 
                type="button" 
                onClick={startRecording}
                className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200"
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
