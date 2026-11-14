import React from 'react';
import { BookResponseDto } from '../../types/api';
import { BookOpen, Trash2 } from 'lucide-react';

interface BookCardProps {
  book: BookResponseDto;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onOpen, onDelete }) => {
  const progress = Math.min(100, Math.max(0, Math.round(book.progress_percentage)));

  return (
    <div className="group relative bg-surface dark:bg-[#1E1B18] rounded-2xl border border-sandBorder dark:border-white/10 p-4 flex flex-col justify-between hover:shadow-warm-hover dark:hover:border-[#D3746B]/40 hover:-translate-y-1 transition-all duration-200">
      {/* Cover Image & Progress Overlay */}
      <div 
        onClick={() => onOpen(book.id)}
        className="relative w-full aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-parchment-deep dark:bg-white/5 shadow-sm mb-3.5 group-hover:brightness-95 transition-all"
      >
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Fallback to placeholder if cover fails to render
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-terracotta/20 flex items-center justify-center text-terracotta mb-2">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-espresso dark:text-[#E8E2D9] line-clamp-3">{book.title}</p>
          </div>
        )}

        {/* Progress pill on top right */}
        {progress > 0 && (
          <div className="absolute top-2.5 right-2.5 bg-espresso/80 dark:bg-black/75 backdrop-blur-md text-white text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
            {progress}%
          </div>
        )}
      </div>

      {/* Book Metadata */}
      <div className="flex-1 flex flex-col justify-between">
        <div onClick={() => onOpen(book.id)} className="cursor-pointer">
          <h3 className="font-semibold text-sm text-espresso dark:text-[#E8E2D9] line-clamp-2 leading-snug group-hover:text-terracotta transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-espresso-muted dark:text-[#9E968F] mt-1 truncate">
            {book.author}
          </p>
        </div>

        {/* Progress Bar & Actions */}
        <div className="mt-4 pt-3 border-t border-sandBorder/60 dark:border-white/10 flex items-center justify-between">
          <div className="flex-1 mr-3">
            <div className="w-full bg-sandBorder dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-terracotta h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-espresso-muted dark:text-[#9E968F]">
              <span>{book.total_chapters} chs</span>
              <span>{progress}% read</span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Remove "${book.title}" from library?`)) {
                onDelete(book.id);
              }
            }}
            title="Delete Book"
            className="p-1.5 rounded-lg text-espresso-muted dark:text-[#9E968F] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
