
import React, { useEffect, useRef, useState } from 'react';

interface VisualizerProps {
  status: 'listening' | 'speaking' | 'idle' | 'waking';
}

const Visualizer: React.FC<VisualizerProps> = ({ status }) => {
  const [blink, setBlink] = useState(false);

  // Periodic blinking effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Determine eye state based on status
  const getEyeHeight = () => {
    if (status === 'idle') return 2; // Closed/Sleeping
    if (blink) return 1; // Blinking
    if (status === 'waking') return 8; // Opening
    if (status === 'listening') return 12; // Attentive
    if (status === 'speaking') return 10; // Active
    return 10;
  };

  const getMouthScale = () => {
    if (status === 'speaking') return 'scaleY(1)';
    if (status === 'listening') return 'scaleY(0.3)';
    return 'scaleY(0.1)';
  };

  const getFaceColor = () => {
    if (status === 'speaking') return 'text-blue-400';
    if (status === 'listening') return 'text-emerald-400';
    if (status === 'waking') return 'text-amber-400';
    return 'text-gray-600';
  };

  const getGlowColor = () => {
    if (status === 'speaking') return 'bg-blue-500/20 shadow-blue-500/40';
    if (status === 'listening') return 'bg-emerald-500/20 shadow-emerald-500/40';
    if (status === 'waking') return 'bg-amber-500/20 shadow-amber-500/40';
    return 'bg-gray-800/20 shadow-transparent';
  };

  return (
    <div className="relative w-64 h-64 flex flex-col items-center justify-center">
      {/* Background Aura */}
      <div className={`absolute w-48 h-48 rounded-full blur-[60px] transition-all duration-1000 ${getGlowColor()}`}></div>
      
      {/* The Face Container */}
      <div className={`relative z-10 w-48 h-48 rounded-full glass border-2 flex flex-col items-center justify-center transition-all duration-500 ${
        status === 'idle' ? 'border-white/5 opacity-50' : 'border-white/20 scale-105'
      }`}>
        
        {/* Eyes Row */}
        <div className="flex gap-12 mb-4">
          {/* Left Eye */}
          <div className="relative w-8 h-12 flex items-center justify-center">
            <div 
              className={`w-full rounded-full transition-all duration-300 ${getFaceColor()} bg-current`}
              style={{ 
                height: `${getEyeHeight() * 4}px`,
                boxShadow: status !== 'idle' ? '0 0 15px currentColor' : 'none'
              }}
            />
          </div>
          
          {/* Right Eye */}
          <div className="relative w-8 h-12 flex items-center justify-center">
            <div 
              className={`w-full rounded-full transition-all duration-300 ${getFaceColor()} bg-current`}
              style={{ 
                height: `${getEyeHeight() * 4}px`,
                boxShadow: status !== 'idle' ? '0 0 15px currentColor' : 'none'
              }}
            />
          </div>
        </div>

        {/* Mouth / Voice Waveform Area */}
        <div className="h-10 w-24 flex items-center justify-center gap-1">
          {status === 'speaking' ? (
            // Animated Mouth for speaking
            [...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1.5 bg-current ${getFaceColor()} rounded-full transition-all duration-75`}
                style={{
                  height: '100%',
                  animation: `mouth-wave 0.6s infinite ease-in-out ${i * 0.1}s`,
                  boxShadow: '0 0 8px currentColor'
                }}
              />
            ))
          ) : (
            // Static/Listening mouth
            <div 
              className={`w-16 rounded-full transition-all duration-500 ${getFaceColor()} bg-current`}
              style={{ 
                height: '4px',
                transform: getMouthScale(),
                opacity: status === 'idle' ? 0.2 : 1,
                boxShadow: status !== 'idle' ? '0 0 8px currentColor' : 'none'
              }}
            />
          )}
        </div>
      </div>

      {/* Decorative Outer Ring */}
      <div className={`absolute w-56 h-56 rounded-full border border-dashed transition-all duration-1000 ${
        status === 'speaking' ? 'border-blue-500/30 rotate-180 scale-110' : 
        status === 'listening' ? 'border-emerald-500/30 rotate-90' : 
        'border-white/5 rotate-0'
      }`} style={{ transition: 'all 2s ease-in-out' }}></div>

      <style>{`
        @keyframes mouth-wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
};

export default Visualizer;
