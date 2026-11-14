import React, { useState, useEffect } from 'react';
import { WordExplanationResponseDto } from '../../types/api';
import { Sparkles, Star, X, Volume2, Loader2, Check } from 'lucide-react';

interface WordCardModalProps {
  word: string;
  sentenceContext: string;
  explanation: WordExplanationResponseDto | null;
  isLoading: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onSaveVocabulary: (word: string, context: string, translation: string, explanation: string) => Promise<void>;
}

export const WordCardModal: React.FC<WordCardModalProps> = ({
  word,
  sentenceContext,
  explanation,
  isLoading,
  position,
  onClose,
  onSaveVocabulary,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  const isSentence = word.trim().split(/\s+/).length > 3;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!position && !isLoading && !explanation) return null;

  // Position calculation: keep within viewport bounds
  const modalStyle: React.CSSProperties = {
    top: position ? Math.min(window.innerHeight - 380, Math.max(70, position.y + 15)) : '50%',
    left: position ? Math.min(window.innerWidth - 420, Math.max(20, position.x - 190)) : '50%',
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!explanation || isSaved || isSaving) return;
    setIsSaving(true);
    try {
      await onSaveVocabulary(
        explanation.word,
        sentenceContext,
        explanation.direct_translation,
        explanation.contextual_explanation
      );
      setIsSaved(true);
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
    } catch (e) {
      console.error('Failed to save vocabulary', e);
    } finally {
      setIsSaving(false);
    }
  };

  const speakWord = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <>
      {/* Invisible backdrop to dismiss when clicking outside */}
      <div
        className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px]"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Word Card Popover */}
      <div
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed z-50 w-96 max-w-[92vw] max-h-[85vh] overflow-y-auto bg-[#FFFFFF] dark:bg-[#262320] text-[#2D2825] dark:text-[#E8E2D9] rounded-2xl border border-black/10 dark:border-white/10 p-5 shadow-2xl animate-fade-in"
      >
        {/* Top Bar: Word / Sentence Header, Star & Close */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-black/10 dark:border-white/10">
          <div className="flex-1 min-w-0">
            {isSentence ? (
              <div>
                <span className="text-[11px] font-bold text-[#D3746B] uppercase tracking-wider block">
                  Terjemahan Kalimat
                </span>
                <p className="text-xs text-black/70 dark:text-white/70 font-medium line-clamp-2 mt-0.5">
                  "{word}"
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg tracking-tight capitalize truncate max-w-[200px]">
                    {word}
                  </h3>
                  <button
                    onClick={speakWord}
                    title="Pronounce word"
                    className="p-1 rounded-full text-black/50 dark:text-white/50 hover:text-terracotta hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                {explanation?.phonetic && (
                  <p className="text-xs text-black/50 dark:text-white/50 font-mono mt-0.5">
                    {explanation.phonetic}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {explanation && (
              <button
                onClick={handleSave}
                disabled={isSaved || isSaving}
                title={isSaved ? 'Saved to Vocabulary' : 'Save to Vocabulary'}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSaved
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                    : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Close (Esc)"
              className="p-1.5 rounded-xl text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Save confirmation toast */}
        {saveSuccessMsg && (
          <div className="mt-2.5 py-1 px-3 bg-amber-500/15 border border-amber-500/25 rounded-lg flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>{isSentence ? 'Kalimat tersimpan di Vocabulary!' : 'Word saved to your Vocabulary Deck!'}</span>
          </div>
        )}

        {/* Body: Translation & Contextual Explanation */}
        <div className="mt-3.5 space-y-3">
          {isLoading ? (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
              <Loader2 className="w-6 h-6 text-terracotta animate-spin" />
              <p className="text-xs text-black/50 dark:text-white/50">
                {isSentence ? 'Menerjemahkan kalimat dengan AI...' : 'Looking up meaning in context...'}
              </p>
            </div>
          ) : explanation ? (
            <>
              {/* Direct Translation Tag */}
              <div className="bg-[#D3746B]/15 border border-[#D3746B]/25 rounded-xl px-3.5 py-2.5 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[#D3746B] uppercase tracking-wider block">
                    Terjemahan
                  </span>
                  <span className="text-[10px] font-semibold opacity-75 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full border border-black/5 dark:border-white/5">
                    {explanation.is_cached ? '⚡ Cached' : '✨ AI Nuance'}
                  </span>
                </div>
                <span className="text-sm font-bold leading-relaxed">
                  {explanation.direct_translation}
                </span>
              </div>

              {/* Contextual Meaning */}
              <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4B8B9B] mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSentence ? 'Nuansa & Analisis Kalimat:' : 'Konteks Kalimat:'}</span>
                </div>
                <p className="text-xs leading-relaxed">
                  {explanation.contextual_explanation}
                </p>
              </div>

              {/* Snippet Context (if single word) */}
              {!isSentence && sentenceContext && (
                <p className="text-[11px] opacity-60 italic line-clamp-2 px-1">
                  "{sentenceContext}"
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-black/50 dark:text-white/50 py-3 text-center">
              Could not fetch explanation.
            </p>
          )}
        </div>
      </div>
    </>
  );
};
