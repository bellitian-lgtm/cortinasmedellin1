import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// Helpers para procesamiento de audio
function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const LiveAgent: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopCall = useCallback(() => {
    setIsActive(false);
    setIsConnecting(false);
    sessionRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const startCall = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);

            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => stopCall(),
          onerror: (e) => {
            console.error("Live Error:", e);
            stopCall();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
          },
          systemInstruction: 'Tu nombre es Sebastian. Eres un asesor de ventas de Cortinas & Estilo Colombia. Eres un hombre amable, educado y profesional. Tu voz es latina neutra. Tu objetivo es asesorar a clientes sobre persianas, cortinas y motorización, y agendar visitas técnicas gratuitas en ciudades como Bogotá, Medellín y Cali. Sé conciso y espera a que el usuario termine de hablar.'
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("No se pudo iniciar la llamada:", err);
      setIsConnecting(false);
    }
  };

  return (
    <section className="bg-slate-900 py-20 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="mb-10">
          <span className="text-amber-500 font-bold tracking-widest uppercase text-xs">Nueva Experiencia</span>
          <h2 className="text-4xl md:text-5xl text-white mt-2 mb-6">Habla con Sebastián</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            ¿Prefieres hablar? Nuestro asesor experto te guiará por voz en tiempo real para elegir la cortina perfecta.
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl inline-block w-full max-w-lg relative z-10">
          <div className="mb-10 flex flex-col items-center">
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${isActive ? 'border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)] scale-110' : 'border-slate-700'}`}>
              <div className={`w-24 h-24 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-inner ${isActive ? 'animate-pulse' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-6 text-center">
              <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Sebastián</h3>
              <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mt-1">
                {isActive ? 'En Línea • Escuchando' : isConnecting ? 'Conectando...' : 'Asesor de Voz'}
              </p>
            </div>
          </div>

          <div className="flex justify-center items-center gap-6">
            {!isActive && !isConnecting ? (
              <button
                onClick={startCall}
                className="bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                INICIAR LLAMADA
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-5 rounded-full transition-all border-2 ${isMuted ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-transparent border-slate-600 text-slate-300 hover:border-white hover:text-white'}`}
                  title={isMuted ? "Desactivar silencio" : "Silenciar micrófono"}
                >
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={stopCall}
                  className="bg-red-600 hover:bg-red-500 text-white p-6 rounded-full shadow-xl transition-all transform hover:rotate-12 active:scale-90"
                  title="Colgar llamada"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L9.286 3.684A1 1 0 008.28 3H5z" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {isActive && (
            <div className="mt-10 flex justify-center gap-1 h-8 items-end">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="w-1 bg-amber-500 rounded-full animate-bounce" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
              ))}
            </div>
          )}
        </div>

        <p className="text-slate-500 text-sm mt-8">
          * Para una mejor experiencia, permite el acceso al micrófono y asegúrate de estar en un lugar tranquilo.
        </p>
      </div>

      {/* Decorative patterns */}
      <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 0 L100 0 L100 100 Z" fill="currentColor" className="text-amber-600" />
        </svg>
      </div>
    </section>
  );
};

export default LiveAgent;
