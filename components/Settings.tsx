
import React from 'react';
import { Settings as SettingsIcon, X, Globe } from 'lucide-react';
import { VoiceConfig, SupportedLanguage } from '../types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  voice: VoiceConfig['voiceName'];
  onVoiceChange: (voice: VoiceConfig['voiceName']) => void;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  systemInstruction: string;
  onSystemInstructionChange: (val: string) => void;
}

const LANGUAGES: SupportedLanguage[] = ['English', 'Hindi', 'Hinglish', 'Spanish', 'French', 'German', 'Japanese', 'Chinese'];

const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  voice,
  onVoiceChange,
  language,
  onLanguageChange,
  systemInstruction,
  onSystemInstructionChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md glass rounded-3xl p-5 sm:p-8 shadow-2xl max-h-[95vh] overflow-y-auto border border-white/10">
        <div className="flex items-center justify-between mb-6 sm:mb-8 sticky top-0 bg-transparent backdrop-blur-md pb-2 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <SettingsIcon className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">Preferences</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close settings"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-emerald-400" />
              <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wider">Language</label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang)}
                  className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all border ${
                    language === lang 
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 font-bold shadow-lg shadow-emerald-900/10' 
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-400'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Voice Persona</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => onVoiceChange(v)}
                  className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all border ${
                    voice === v 
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold shadow-lg shadow-blue-900/10' 
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-400'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Core Directives</label>
            <textarea
              value={systemInstruction}
              onChange={(e) => onSystemInstructionChange(e.target.value)}
              className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs sm:text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none transition-all placeholder:text-gray-600"
              placeholder="Tell JSON how to behave..."
            />
            <p className="mt-2 text-[10px] text-gray-500 italic px-1">
              Note: Changes take effect on the next connection session.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-10 py-4 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-bold rounded-2xl transition-all shadow-xl shadow-rose-900/20"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
};

export default Settings;
