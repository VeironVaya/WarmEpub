import React, { useState } from 'react';
import { TocItemDto, BookmarkDto } from '../../types/api';
import { X, BookOpen, Check, Bookmark, Trash2 } from 'lucide-react';

interface TableOfContentsProps {
  isOpen: boolean;
  onClose: () => void;
  toc: TocItemDto[];
  currentChapterIndex: number;
  onSelectChapter: (index: number) => void;
  bookTitle: string;
  bookmarks: BookmarkDto[];
  onSelectBookmark: (bookmark: BookmarkDto) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  isOpen,
  onClose,
  toc,
  currentChapterIndex,
  onSelectChapter,
  bookTitle,
  bookmarks,
  onSelectBookmark,
  onDeleteBookmark,
}) => {
  const [activeTab, setActiveTab] = useState<'toc' | 'bookmarks'>('toc');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-[#FFFFFF] dark:bg-[#1E1B18] text-[#2D2825] dark:text-[#E8E2D9] h-full shadow-2xl flex flex-col border-r border-black/10 dark:border-white/10 z-10">
        {/* Drawer Header */}
        <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D3746B]/20 flex items-center justify-center text-[#D3746B]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm truncate max-w-[200px]">{bookTitle}</h3>
              <p className="text-[11px] opacity-60">Navigation & Bookmarks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-black/10 dark:border-white/10 px-3 pt-2 gap-2 bg-black/2 dark:bg-white/2">
          <button
            onClick={() => setActiveTab('toc')}
            className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'toc'
                ? 'border-[#D3746B] text-[#D3746B] bg-white dark:bg-[#1E1B18]'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Chapters ({toc.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'bookmarks'
                ? 'border-[#D3746B] text-[#D3746B] bg-white dark:bg-[#1E1B18]'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmarks ({bookmarks.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {activeTab === 'toc' ? (
            // Chapter List
            toc.map((item) => {
              const isCurrent = item.index === currentChapterIndex;
              return (
                <button
                  key={item.index}
                  onClick={() => {
                    onSelectChapter(item.index);
                    onClose();
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm flex items-center justify-between transition-all ${
                    isCurrent
                      ? 'bg-[#D3746B]/15 text-[#D3746B] font-bold shadow-xs'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#D3746B]'
                  }`}
                >
                  <span className="truncate pr-2">{item.title}</span>
                  {isCurrent && <Check className="w-4 h-4 shrink-0 text-[#D3746B]" />}
                </button>
              );
            })
          ) : (
            // Bookmarks List
            bookmarks.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Bookmark className="w-8 h-8 text-[#D3746B]/40 mx-auto mb-2" />
                <p className="text-sm font-semibold opacity-70">No bookmarks yet</p>
                <p className="text-xs opacity-50 mt-1">
                  Click the bookmark ribbon in the top bar while reading to save your spot!
                </p>
              </div>
            ) : (
              bookmarks.map((bm) => {
                const chapterTitle =
                  toc.find((t) => t.index === bm.chapter_index)?.title ||
                  `Chapter ${bm.chapter_index + 1}`;
                return (
                  <div
                    key={bm.id}
                    className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2 hover:border-[#D3746B]/40 transition-all flex items-start justify-between gap-2"
                  >
                    <button
                      onClick={() => {
                        onSelectBookmark(bm);
                        onClose();
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#D3746B]">
                        <Bookmark className="w-3.5 h-3.5 fill-[#D3746B]" />
                        <span>{chapterTitle}</span>
                        <span className="opacity-60 font-normal">· Page {bm.page_number}</span>
                      </div>
                      {bm.snippet && (
                        <p className="text-xs opacity-75 italic line-clamp-2 mt-1">
                          "{bm.snippet}"
                        </p>
                      )}
                      <p className="text-[10px] opacity-40 mt-1">
                        {new Date(bm.created_at).toLocaleDateString()}
                      </p>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBookmark(bm.id);
                      }}
                      title="Delete bookmark"
                      className="p-1.5 rounded-lg opacity-40 hover:opacity-100 hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
};
