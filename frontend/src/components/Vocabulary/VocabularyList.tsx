import React, { useState } from 'react';
import { VocabularyResponseDto } from '../../types/api';
import { BookmarkCheck, Search, Sparkles, BookOpen, Volume2 } from 'lucide-react';

interface VocabularyListProps {
  vocabulary: VocabularyResponseDto[];
  isLoading: boolean;
}

export const VocabularyList: React.FC<VocabularyListProps> = ({
  vocabulary,
  isLoading,
}) => {
  const [search, setSearch] = useState('');

  const filtered = vocabulary.filter(
    (v) =>
      v.word.toLowerCase().includes(search.toLowerCase()) ||
      v.translation.toLowerCase().includes(search.toLowerCase()) ||
      (v.book_title && v.book_title.toLowerCase().includes(search.toLowerCase()))
  );

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-espresso dark:text-[#E8E2D9] flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-tealAccent" />
            Starred Vocabulary
          </h2>
          <p className="text-xs text-espresso-muted dark:text-[#9E968F] mt-0.5">
            Review words and AI explanations saved while reading
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-muted dark:text-[#9E968F]" />
          <input
            type="text"
            placeholder="Search saved words..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface dark:bg-[#1E1B18] border border-sandBorder dark:border-white/10 rounded-2xl pl-10 pr-4 py-2 text-sm text-espresso dark:text-[#E8E2D9] placeholder:text-espresso-muted/70 dark:placeholder:text-[#9E968F]/70 focus:outline-none focus:ring-2 focus:ring-tealAccent/40 shadow-sm transition-colors"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-surface dark:bg-[#1E1B18] rounded-2xl border border-sandBorder dark:border-white/10 p-5 h-28" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-surface dark:bg-[#1E1B18] rounded-2xl border border-sandBorder dark:border-white/10 p-5 shadow-warm hover:shadow-warm-hover transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-bold text-base text-espresso dark:text-[#E8E2D9] capitalize">
                    {item.word}
                  </h3>
                  <button
                    onClick={() => speakWord(item.word)}
                    title="Pronounce"
                    className="p-1 rounded-full text-espresso-muted dark:text-[#9E968F] hover:text-terracotta hover:bg-parchment-deep dark:hover:bg-white/10 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-semibold bg-terracotta-light dark:bg-terracotta/20 text-terracotta px-2.5 py-0.5 rounded-full border border-terracotta/20">
                    {item.translation}
                  </span>
                </div>

                {item.book_title && (
                  <span className="text-[11px] font-medium text-espresso-muted dark:text-[#9E968F] flex items-center gap-1 bg-parchment dark:bg-white/5 px-2.5 py-1 rounded-lg border border-sandBorder dark:border-white/10 truncate max-w-[200px]">
                    <BookOpen className="w-3 h-3 text-tealAccent shrink-0" />
                    <span className="truncate">{item.book_title}</span>
                  </span>
                )}
              </div>

              {/* Contextual Nuance */}
              <div className="mt-3 bg-parchment/60 dark:bg-white/5 rounded-xl p-3 border border-sandBorder/70 dark:border-white/10 transition-colors">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-tealAccent mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Konteks Nuansa (AI):</span>
                </div>
                <p className="text-xs text-espresso dark:text-[#E8E2D9] leading-relaxed">
                  {item.ai_explanation}
                </p>
              </div>

              {/* Original Book Sentence */}
              {item.sentence_context && (
                <p className="text-xs text-espresso-muted dark:text-[#9E968F] italic mt-2.5 px-1">
                  "{item.sentence_context}"
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface dark:bg-[#1E1B18] rounded-3xl border border-sandBorder dark:border-white/10 p-12 text-center max-w-md mx-auto shadow-warm transition-colors">
          <div className="w-16 h-16 rounded-2xl bg-tealAccent/15 dark:bg-tealAccent/20 text-tealAccent flex items-center justify-center mx-auto mb-4">
            <BookmarkCheck className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-espresso dark:text-[#E8E2D9] mb-1">No Saved Vocabulary</h3>
          <p className="text-xs text-espresso-muted dark:text-[#9E968F] leading-relaxed">
            Click on words while reading an EPUB to look up their meaning and star them into your personal notebook.
          </p>
        </div>
      )}
    </main>
  );
};
