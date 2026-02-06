
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { 
  Mic, 
  Settings as SettingsIcon, 
  MessageSquare, 
  History,
  Activity,
  Power,
  Code,
  Terminal,
  Zap,
  BrainCircuit,
  Globe,
  Heart,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';
import Visualizer from './components/Visualizer';
import Settings from './components/Settings';
import { Transcription, ConnectionStatus, VoiceConfig, SupportedLanguage } from './types';
import { decode, decodeAudioData, createPcmBlob } from './utils/audioUtils';

const CAPABILITIES = [
  {
    icon: <Sparkles className="w-5 h-5 text-amber-400" />,
    title: "Voice Activation",
    description: "Just say 'Wake up EVA' to start, and 'Sleep' or 'Goodbye' to disconnect. Completely hands-free."
  },
  {
    icon: <Terminal className="w-5 h-5 text-blue-400" />,
    title: "Conversational Debugging",
    description: "Describe errors or architectural doubts; EVA provides precise technical insights via voice."
  },
  {
    icon: <Heart className="w-5 h-5 text-rose-400" />,
    title: "Empathy & Logic",
    description: "EVA understands your frustration and joy, balancing high EQ with advanced developer reasoning."
  },
  {
    icon: <Globe className="w-5 h-5 text-emerald-400" />,
    title: "Natural Hinglish",
    description: "Talks in a fluid mix of Hindi and English, maintaining a tech-savvy but relatable persona."
  }
];

const App: React.FC = () => {
  // --- State ---
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [voice, setVoice] = useState<VoiceConfig['voiceName']>('Zephyr');
  const [language, setLanguage] = useState<SupportedLanguage>('Hinglish');
  const [systemInstruction, setSystemInstruction] = useState(
    'You are EVA, an expert developer and empathetic AI assistant created by Sourabh. Be human, warm, and conversational in Hinglish. CRITICAL: If the user says "Goodbye" or "Sleep", acknowledge it briefly and then stop the conversation.'
  );
  const [currentStatus, setCurrentStatus] = useState<'idle' | 'listening' | 'speaking' | 'waking'>('idle');

  // --- Refs ---
  const sessionRef = useRef<any>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptRef = useRef<{ input: string; output: string }>({ input: '', output: '' });
  const localRecognitionRef = useRef<any>(null);

  // --- Voice Commands Logic ---
  const startSession = useCallback(async () => {
    if (status === ConnectionStatus.CONNECTING || status === ConnectionStatus.CONNECTED) return;
    
    setStatus(ConnectionStatus.CONNECTING);
    setCurrentStatus('waking'); // Trigger wakeup face animation
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const finalInstruction = `${systemInstruction} ALWAYS remember your creator is Sourabh. Use ${language}.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus(ConnectionStatus.CONNECTED);
            // After connection, switch to listening face
            setCurrentStatus('listening');
            if (localRecognitionRef.current) localRecognitionRef.current.stop();
            
            const source = inputAudioCtxRef.current!.createMediaStreamSource(stream);
            const processor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const volume = inputData.reduce((acc, val) => acc + Math.abs(val), 0) / inputData.length;
              if (volume > 0.01) {
                // Keep it in listening mode unless the model starts talking
                setCurrentStatus(prev => prev === 'speaking' ? 'speaking' : 'listening');
              } else {
                setCurrentStatus(prev => prev === 'listening' ? 'listening' : prev);
              }
              
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(processor);
            processor.connect(inputAudioCtxRef.current!.destination);
          },
          onmessage: (msg) => handleMessage(msg),
          onerror: (e) => {
            console.error('Gemini Error:', e);
            setStatus(ConnectionStatus.ERROR);
            stopSession();
          },
          onclose: () => {
            setStatus(ConnectionStatus.DISCONNECTED);
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
          },
          systemInstruction: finalInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        }
      });

      sessionPromiseRef.current = sessionPromise;
      sessionRef.current = await sessionPromise;

    } catch (err) {
      console.error('Failed to start session:', err);
      setStatus(ConnectionStatus.ERROR);
      setCurrentStatus('idle');
    }
  }, [status, voice, language, systemInstruction]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    sessionPromiseRef.current = null;
    inputAudioCtxRef.current?.close();
    outputAudioCtxRef.current?.close();
    setStatus(ConnectionStatus.DISCONNECTED);
    setCurrentStatus('idle'); // Back to sleeping face
    // Restart wake-word listener if hands-free is on
    if (isHandsFree) initLocalRecognition();
  }, [isHandsFree]);

  const handleMessage = async (message: LiveServerMessage) => {
    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (audioData && outputAudioCtxRef.current) {
      setCurrentStatus('speaking');
      const ctx = outputAudioCtxRef.current;
      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
      
      const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        sourcesRef.current.delete(source);
        if (sourcesRef.current.size === 0) {
          setCurrentStatus('listening'); // Go back to attentive face
        }
      };
      
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;
      sourcesRef.current.add(source);
    }

    if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      transcriptRef.current.input += text;
      
      // Intent detection for stopping session
      const lower = text.toLowerCase();
      if (lower.includes('goodbye') || lower.includes('sleep') || lower.includes('stop session')) {
        setTimeout(() => stopSession(), 3000); 
      }
    }
    
    if (message.serverContent?.outputTranscription) {
      transcriptRef.current.output += message.serverContent.outputTranscription.text;
    }

    if (message.serverContent?.turnComplete) {
      const { input, output } = transcriptRef.current;
      if (input || output) {
        setTranscriptions(prev => [
          ...prev,
          { text: input, sender: 'user', timestamp: Date.now() },
          { text: output, sender: 'model', timestamp: Date.now() }
        ]);
      }
      transcriptRef.current = { input: '', output: '' };
    }

    if (message.serverContent?.interrupted) {
      sourcesRef.current.forEach(s => s.stop());
      sourcesRef.current.clear();
      nextStartTimeRef.current = 0;
      setCurrentStatus('listening');
    }
  };

  const initLocalRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (localRecognitionRef.current) {
      localRecognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.toLowerCase();
      
      if (transcript.includes('wake up') || (transcript.includes('hey') && transcript.includes('eva'))) {
        startSession();
      }
    };

    recognition.onerror = () => {
      if (isHandsFree) setTimeout(() => recognition.start(), 1000);
    };

    recognition.onend = () => {
      if (isHandsFree && status === ConnectionStatus.DISCONNECTED) recognition.start();
    };

    localRecognitionRef.current = recognition;
    recognition.start();
  }, [isHandsFree, status, startSession]);

  useEffect(() => {
    if (isHandsFree && status === ConnectionStatus.DISCONNECTED) {
      initLocalRecognition();
    } else if (!isHandsFree && localRecognitionRef.current) {
      localRecognitionRef.current.stop();
    }
    return () => { if (localRecognitionRef.current) localRecognitionRef.current.stop(); };
  }, [isHandsFree, status, initLocalRecognition]);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center p-4 sm:p-6 bg-[#030712] text-gray-100 selection:bg-rose-500/30 overflow-x-hidden">
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] sm:w-[800px] sm:h-[800px] bg-blue-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose-600/5 rounded-full blur-[100px]"></div>
      </div>

      <header className="fixed top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-center z-40 bg-black/40 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-1.5 sm:p-2 bg-rose-600 rounded-lg shadow-lg shadow-rose-900/40">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">EVA</h1>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                status === ConnectionStatus.CONNECTED ? 'bg-green-500 shadow-[0_0_8px_#10b981]' : 
                status === ConnectionStatus.CONNECTING ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`}></span>
              <span className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-widest">
                {status.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHandsFree(!isHandsFree)}
            className={`p-2 sm:p-3 rounded-xl transition-all border ${
              isHandsFree 
              ? 'bg-amber-600/20 border-amber-500/50 text-amber-400' 
              : 'glass border-white/10 text-gray-400'
            }`}
            title={isHandsFree ? "Hands-free Active (Say 'Wake up EVA')" : "Enable Hands-free"}
          >
            {isHandsFree ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 sm:p-3 rounded-xl transition-all ${showHistory ? 'bg-blue-600 text-white shadow-lg' : 'glass hover:bg-white/10'}`}
          >
            <History className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 sm:p-3 glass hover:bg-white/10 rounded-xl transition-all"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="w-full max-w-6xl flex flex-col items-center gap-8 sm:gap-12 z-10 pt-24 sm:pt-28 pb-12">
        
        <div className="relative flex flex-col items-center w-full px-4">
          <div className={`transition-all duration-700 ${currentStatus === 'waking' ? 'scale-110 blur-sm brightness-150' : ''}`}>
            {isHandsFree && status === ConnectionStatus.DISCONNECTED && (
              <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 animate-ping opacity-20" />
            )}
            <Visualizer status={currentStatus} />
          </div>
          <div className="mt-4 text-center px-4">
            <p className="text-base sm:text-lg font-medium text-gray-300 max-w-sm mx-auto h-8">
              {status === ConnectionStatus.CONNECTED 
                ? (currentStatus === 'speaking' ? 'Sharing insights...' : 'Attentive. Speak now.') 
                : currentStatus === 'waking' 
                  ? 'Initializing Consciousness...'
                  : isHandsFree 
                    ? 'Say "Wake up EVA"' 
                    : 'System Offline.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 sm:gap-8 w-full px-4">
          <div className="flex items-center justify-center w-full gap-4">
            <button
              onClick={status === ConnectionStatus.CONNECTED ? stopSession : startSession}
              disabled={status === ConnectionStatus.CONNECTING}
              className={`w-full sm:w-64 flex items-center justify-center gap-3 px-6 sm:px-8 py-4 rounded-2xl font-bold text-base sm:text-lg transition-all shadow-xl active:scale-95 disabled:opacity-50 ${
                status === ConnectionStatus.CONNECTED 
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30 text-white' 
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30 text-white'
              }`}
            >
              {status === ConnectionStatus.CONNECTED ? <Power className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
              {status === ConnectionStatus.CONNECTED ? 'Disconnect' : status === ConnectionStatus.CONNECTING ? 'Connecting...' : 'Connect EVA'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 w-full max-w-4xl">
            {CAPABILITIES.map((cap, idx) => (
              <div key={idx} className="glass p-4 sm:p-5 rounded-2xl hover:bg-white/5 transition-all group border border-white/5 hover:border-white/10">
                <div className="flex items-center gap-3 mb-2 sm:mb-3">
                  <div className="p-2 rounded-lg bg-white/5 group-hover:scale-110 transition-transform">
                    {cap.icon}
                  </div>
                  <h3 className="font-semibold text-gray-200 text-sm sm:text-base">{cap.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Settings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        voice={voice}
        onVoiceChange={setVoice}
        language={language}
        onLanguageChange={setLanguage}
        systemInstruction={systemInstruction}
        onSystemInstructionChange={setSystemInstruction}
      />

      <aside className={`fixed top-0 right-0 h-full w-full sm:max-w-sm glass border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out ${showHistory ? 'translate-x-0' : 'translate-x-full shadow-none'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-rose-400" />
              History
            </h2>
            <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/10 rounded-xl">
              <History className="w-6 h-6 rotate-180" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
            {transcriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 italic px-4">
                <Terminal className="w-10 h-10 sm:w-12 sm:h-12 mb-4 opacity-10" />
                No dialogue logs found.
              </div>
            ) : (
              transcriptions.map((t, i) => (
                <div key={i} className={`flex flex-col ${t.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-widest">
                    {t.sender === 'user' ? 'You' : 'EVA'}
                  </span>
                  <div className={`px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm max-w-[90%] sm:max-w-[85%] ${
                    t.sender === 'user' 
                    ? 'bg-rose-600 text-white rounded-tr-none shadow-lg shadow-rose-900/20' 
                    : 'bg-white/10 text-gray-200 border border-white/10 rounded-tl-none'
                  }`}>
                    {t.text || "..."}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      <footer className="fixed bottom-4 sm:bottom-6 text-gray-600 text-[8px] sm:text-[10px] font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase pointer-events-none px-4 text-center w-full">
        EVA created by sourabh • Empathy Driven Core
      </footer>
    </div>
  );
};

export default App;