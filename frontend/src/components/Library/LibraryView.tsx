import React, { useState } from 'react';
import { BookResponseDto } from '../../types/api';
import { BookCard } from './BookCard';
import { Search, Plus, BookOpen } from 'lucide-react';

interface LibraryViewProps {
  books: BookResponseDto[];
  isLoading: boolean;
  onOpenBook: (id: string) => void;
  onDeleteBook: (id: string) => void;
  onOpenUpload: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  isLoading,
  onOpenBook,
  onDeleteBook,
  onOpenUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'reading' | 'finished'>('all');

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'reading') {
      return book.progress_percentage > 0 && book.progress_percentage < 100;
    }
    if (filterMode === 'finished') {
      return book.progress_percentage >= 100;
    }
    return true;
  });

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-muted dark:text-[#9E968F]" />
          <input
            type="text"
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface dark:bg-[#1E1B18] border border-sandBorder dark:border-white/10 rounded-2xl pl-10 pr-4 py-2 text-sm text-espresso dark:text-[#E8E2D9] placeholder:text-espresso-muted/70 dark:placeholder:text-[#9E968F]/70 focus:outline-none focus:ring-2 focus:ring-terracotta/40 transition-all shadow-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-parchment-deep/60 dark:bg-white/5 p-1 rounded-2xl border border-sandBorder/70 dark:border-white/10 self-stretch sm:self-auto transition-colors">
          {(['all', 'reading', 'finished'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3.5 py-1 text-xs font-semibold rounded-xl capitalize transition-all ${
                filterMode === mode
                  ? 'bg-surface dark:bg-[#262320] text-espresso dark:text-[#E8E2D9] shadow-sm'
                  : 'text-espresso-muted dark:text-[#9E968F] hover:text-espresso dark:hover:text-[#E8E2D9]'
              }`}
            >
              {mode === 'all' ? 'All Books' : mode === 'reading' ? 'Reading' : 'Finished'}
            </button>
          ))}
        </div>
      </div>

      {/* Book Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse bg-surface/60 dark:bg-[#1E1B18]/60 rounded-2xl border border-sandBorder dark:border-white/10 p-4">
              <div className="w-full aspect-[2/3] bg-sandBorder/50 dark:bg-white/10 rounded-xl mb-3" />
              <div className="h-4 bg-sandBorder/50 dark:bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-sandBorder/40 dark:bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onOpen={onOpenBook}
              onDelete={onDeleteBook}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-surface dark:bg-[#1E1B18] rounded-3xl border border-sandBorder dark:border-white/10 p-12 text-center max-w-md mx-auto shadow-warm transition-colors">
          <div className="w-16 h-16 rounded-2xl bg-terracotta/15 dark:bg-terracotta/20 text-terracotta flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-espresso dark:text-[#E8E2D9] mb-1">Your Library is Empty</h3>
          <p className="text-xs text-espresso-muted dark:text-[#9E968F] leading-relaxed mb-6">
            Upload your favorite EPUB books and start an immersive, distraction-free reading experience.
          </p>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 bg-terracotta hover:bg-terracotta-hover text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-warm hover:shadow-warm-hover transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Your First Book</span>
          </button>
        </div>
      )}
    </main>
  );
};
