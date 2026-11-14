import React from 'react';
import { X, Sliders, Check } from 'lucide-react';

export interface ReaderSettings {
  fontSize: number; // in px, e.g. 18
  fontFamily: 'sans' | 'serif';
  lineHeight: number; // 1.5, 1.75, 2.0
  theme: 'parchment' | 'white' | 'dark';
}

interface ReaderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
}

export const ReaderSettingsModal: React.FC<ReaderSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-surface dark:bg-[#1E1B18] text-espresso dark:text-[#E8E2D9] rounded-3xl border border-sandBorder dark:border-white/10 p-6 shadow-warm-popover transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-sandBorder/70 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-terracotta" />
            <h3 className="font-bold text-base text-espresso dark:text-[#E8E2D9]">Reading Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-espresso-muted dark:text-[#9E968F] hover:text-espresso dark:hover:text-[#E8E2D9] hover:bg-parchment dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Font Size Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-espresso dark:text-[#E8E2D9] mb-2">
              <span>Text Size</span>
              <span>{settings.fontSize}px</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-espresso-muted dark:text-[#9E968F]">A</span>
              <input
                type="range"
                min="14"
                max="28"
                step="1"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value) })}
                className="flex-1 accent-terracotta h-1.5 bg-sandBorder dark:bg-white/15 rounded-lg cursor-pointer"
              />
              <span className="text-base font-bold text-espresso dark:text-[#E8E2D9]">A</span>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="text-xs font-semibold text-espresso dark:text-[#E8E2D9] block mb-2">Font Family</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ fontFamily: 'sans' })}
                className={`p-2.5 rounded-xl border text-xs font-sans font-medium flex items-center justify-center gap-1.5 transition-all ${
                  settings.fontFamily === 'sans'
                    ? 'border-terracotta bg-terracotta-light dark:bg-terracotta/20 text-terracotta font-semibold'
                    : 'border-sandBorder dark:border-white/10 bg-parchment/60 dark:bg-white/5 text-espresso dark:text-[#E8E2D9] hover:bg-parchment dark:hover:bg-white/10'
                }`}
              >
                <span>Neo-Grotesque</span>
                {settings.fontFamily === 'sans' && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => onUpdateSettings({ fontFamily: 'serif' })}
                className={`p-2.5 rounded-xl border text-xs font-serif font-medium flex items-center justify-center gap-1.5 transition-all ${
                  settings.fontFamily === 'serif'
                    ? 'border-terracotta bg-terracotta-light dark:bg-terracotta/20 text-terracotta font-semibold'
                    : 'border-sandBorder dark:border-white/10 bg-parchment/60 dark:bg-white/5 text-espresso dark:text-[#E8E2D9] hover:bg-parchment dark:hover:bg-white/10'
                }`}
              >
                <span>Editorial Serif</span>
                {settings.fontFamily === 'serif' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Reading Themes */}
          <div>
            <label className="text-xs font-semibold text-espresso dark:text-[#E8E2D9] block mb-2">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onUpdateSettings({ theme: 'parchment' })}
                className={`p-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                  settings.theme === 'parchment'
                    ? 'border-terracotta ring-2 ring-terracotta/30 bg-[#F5EFEB]'
                    : 'border-sandBorder bg-[#F5EFEB] hover:brightness-95'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-[#E5DDD3]" />
                <span className="text-espresso">Warm Oat</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ theme: 'white' })}
                className={`p-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                  settings.theme === 'white'
                    ? 'border-terracotta ring-2 ring-terracotta/30 bg-white'
                    : 'border-sandBorder bg-white hover:brightness-95'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-gray-200" />
                <span className="text-espresso">Paper White</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`p-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                  settings.theme === 'dark'
                    ? 'border-terracotta ring-2 ring-terracotta/30 bg-[#2D2825] text-parchment'
                    : 'border-sandBorder bg-[#2D2825] text-parchment hover:brightness-110'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-[#4A433E]" />
                <span className="text-parchment">Midnight</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
