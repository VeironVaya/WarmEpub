import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookDetailDto,
  ChapterResponseDto,
  WordExplanationResponseDto,
  BookmarkDto,
} from '../../types/api';
import { api } from '../../services/api';
import { TableOfContents } from './TableOfContents';
import { ReaderSettingsModal, ReaderSettings } from './ReaderSettingsModal';
import { WordCardModal } from './WordCardModal';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  Sliders,
  Loader2,
  BookOpen,
  Scroll,
  Sun,
  Moon,
  Bookmark,
} from 'lucide-react';

const COLUMN_GAP_PX = 80;

interface ReaderViewProps {
  book: BookDetailDto;
  onBackToLibrary: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  onBackToLibrary,
  theme: propTheme,
  onToggleTheme: propToggleTheme,
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(
    book.current_chapter_index || 0
  );
  const [chapterData, setChapterData] = useState<ChapterResponseDto | null>(null);
  const [isLoadingChapter, setIsLoadingChapter] = useState(true);

  // Pagination for Book Mode
  const [currentPage, setCurrentPage] = useState(0); // spread page index (0, 2, 4...)
  const [totalPages, setTotalPages] = useState(2);
  const [columnViewportWidth, setColumnViewportWidth] = useState<number>(0);
  const [pendingNavTarget, setPendingNavTarget] = useState<'start' | 'end'>('start');

  // View Mode: 'book' (2-page spread) or 'scroll' (continuous vertical)
  const [viewMode, setViewMode] = useState<'book' | 'scroll'>(() => {
    return (localStorage.getItem('epub_reader_view_mode') as 'book' | 'scroll') || 'book';
  });

  // Theme: 'light' or 'dark'
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('epub_reader_theme') as 'light' | 'dark') || 'light';
  });

  const theme = propTheme !== undefined ? propTheme : localTheme;
  const isDark = theme === 'dark';

  // Drawers & Modals
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<BookmarkDto[]>([]);

  // Reading Settings
  const [settings, setSettings] = useState<ReaderSettings>({
    fontSize: 18,
    fontFamily: 'sans',
    lineHeight: 1.75,
    theme: 'parchment',
  });

  // Word / Sentence Lookup State
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [sentenceContext, setSentenceContext] = useState<string>('');
  const [wordExplanation, setWordExplanation] =
    useState<WordExplanationResponseDto | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [lookupPosition, setLookupPosition] = useState<{ x: number; y: number } | null>(
    null
  );

  const bookColumnsContainerRef = useRef<HTMLDivElement | null>(null);
  const bookViewportRef = useRef<HTMLDivElement>(null);

  // Sync theme with DOM document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('epub_reader_theme', theme);
  }, [theme]);

  // Load Bookmarks for current book
  useEffect(() => {
    api
      .getBookmarks(book.id)
      .then(setBookmarks)
      .catch((err) => console.error('Failed to load bookmarks', err));
  }, [book.id]);

  // Load Chapter
  useEffect(() => {
    let isMounted = true;
    const loadChapter = async () => {
      setIsLoadingChapter(true);
      try {
        const data = await api.getChapter(book.id, currentChapterIndex);
        if (isMounted) {
          setChapterData(data);
          if (pendingNavTarget === 'start') {
            setCurrentPage(0);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }

          // Sync progress with backend
          const progressPercentage =
            ((currentChapterIndex + 1) / book.total_chapters) * 100;
          await api.updateProgress(book.id, {
            current_chapter_index: currentChapterIndex,
            progress_percentage: Math.min(100, progressPercentage),
          });
        }
      } catch (err) {
        console.error('Failed to load chapter', err);
      } finally {
        if (isMounted) setIsLoadingChapter(false);
      }
    };

    loadChapter();
    return () => {
      isMounted = false;
    };
  }, [book.id, currentChapterIndex, book.total_chapters]);

  // Measure Book Mode pages and column viewport
  const measurePages = useCallback(
    (targetNode?: HTMLDivElement | null) => {
      const container = targetNode || bookColumnsContainerRef.current;
      if (!container) return;

      const clientW = container.clientWidth;
      const scrollW = container.scrollWidth;
      if (clientW > 0) {
        setColumnViewportWidth(clientW);
        const step = clientW + COLUMN_GAP_PX;
        const spreads = Math.max(1, Math.ceil((scrollW + COLUMN_GAP_PX) / step));
        const calculatedPages = Math.max(2, spreads * 2);
        setTotalPages(calculatedPages);

        if (pendingNavTarget === 'end') {
          const lastSpread = Math.max(0, Math.floor((calculatedPages - 1) / 2) * 2);
          setCurrentPage(lastSpread);
          setPendingNavTarget('start');
        }
      }
    },
    [pendingNavTarget]
  );

  // React Callback Ref: instantly fires measurePages the moment the book node attaches to DOM
  const setBookColumnsRef = useCallback(
    (node: HTMLDivElement | null) => {
      bookColumnsContainerRef.current = node;
      if (node) {
        measurePages(node);
      }
    },
    [measurePages]
  );

  // Lifecycle observer for layout changes, font loads, image loads, and resize
  useEffect(() => {
    if (viewMode !== 'book' || isLoadingChapter) return;
    const container = bookColumnsContainerRef.current;
    if (!container) return;

    measurePages(container);

    const rAF = requestAnimationFrame(() => measurePages(container));
    const timer1 = setTimeout(() => measurePages(container), 50);
    const timer2 = setTimeout(() => measurePages(container), 250);

    const ro = new ResizeObserver(() => {
      measurePages(container);
    });
    ro.observe(container);

    const images = container.querySelectorAll('img');
    images.forEach((img) => img.addEventListener('load', () => measurePages(container)));

    if (document.fonts) {
      document.fonts.ready.then(() => measurePages(container));
    }

    return () => {
      cancelAnimationFrame(rAF);
      clearTimeout(timer1);
      clearTimeout(timer2);
      ro.disconnect();
      images.forEach((img) => img.removeEventListener('load', () => measurePages(container)));
    };
  }, [
    chapterData,
    currentChapterIndex,
    isLoadingChapter,
    settings.fontSize,
    settings.fontFamily,
    settings.lineHeight,
    viewMode,
    measurePages,
  ]);

  // Bookmark Toggle
  const isCurrentBookmarked = bookmarks.some(
    (b) =>
      b.chapter_index === currentChapterIndex &&
      b.page_number === (viewMode === 'book' ? currentPage + 1 : 1)
  );

  const handleToggleBookmark = async () => {
    const pageNum = viewMode === 'book' ? currentPage + 1 : 1;
    const existing = bookmarks.find(
      (b) => b.chapter_index === currentChapterIndex && b.page_number === pageNum
    );

    if (existing) {
      try {
        await api.deleteBookmark(book.id, existing.id);
        setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
      } catch (err) {
        console.error('Failed to delete bookmark', err);
      }
    } else {
      try {
        const snippet = chapterData?.title || `Chapter ${currentChapterIndex + 1}`;
        const created = await api.createBookmark(book.id, {
          chapter_index: currentChapterIndex,
          page_number: pageNum,
          snippet: snippet.slice(0, 100),
        });
        setBookmarks((prev) => [created, ...prev]);
      } catch (err) {
        console.error('Failed to create bookmark', err);
      }
    }
  };

  // ==================== NAVIGATION HANDLERS ====================
  // 1. Page Spread Navigation (Within the Chapter)
  const handleNextPageSpread = () => {
    if (currentPage + 2 < totalPages) {
      setCurrentPage((prev) => prev + 2);
    }
  };

  const handlePrevPageSpread = () => {
    if (currentPage >= 2) {
      setCurrentPage((prev) => prev - 2);
    }
  };

  // 2. Chapter Navigation (Between Chapters)
  const handleNextChapter = () => {
    if (currentChapterIndex < book.total_chapters - 1) {
      setPendingNavTarget('start');
      setCurrentChapterIndex((prev) => prev + 1);
      setCurrentPage(0);
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setPendingNavTarget('end');
      setCurrentChapterIndex((prev) => prev - 1);
    }
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTocOpen || isSettingsOpen || selectedWord) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (viewMode === 'book') {
          handleNextPageSpread();
        } else {
          handleNextChapter();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (viewMode === 'book') {
          handlePrevPageSpread();
        } else {
          handlePrevChapter();
        }
      } else if (e.key === 't' || e.key === 'T') {
        setIsTocOpen(true);
      } else if (e.key === 'Escape') {
        onBackToLibrary();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentChapterIndex,
    currentPage,
    totalPages,
    viewMode,
    isTocOpen,
    isSettingsOpen,
    selectedWord,
  ]);

  // Intercept text selection on mouse up (supports words and full sentences)
  const handleContentMouseUp = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const raw = selection.toString().trim();
    if (!raw) return;

    const words = raw.split(/\s+/).filter(Boolean);
    // Discard excessively huge accidental selects (> 250 words or > 1500 chars)
    if (words.length > 250 || raw.length > 1500) return;

    const isSentence = words.length > 3;
    let targetText = raw;
    let contextText = '';

    if (!isSentence) {
      targetText = raw.replace(/^[^\w\s]+|[^\w\s]+$/g, '');
      if (targetText.length < 2) return;

      if (selection.anchorNode) {
        const fullText = selection.anchorNode.textContent || '';
        contextText = fullText
          .slice(Math.max(0, selection.anchorOffset - 60), selection.anchorOffset + 120)
          .trim();
      }
      if (!contextText) {
        contextText = `Word used in ${book.title}.`;
      }
    } else {
      // For sentences and phrases, the selected block is both the target and its context
      contextText = raw;
    }

    setSelectedWord(targetText);
    setSentenceContext(contextText);
    setLookupPosition({ x: e.clientX, y: e.clientY });
    setIsLoadingExplanation(true);
    setWordExplanation(null);

    api
      .explainWord({
        word: targetText,
        sentence_context: contextText,
        target_language: 'id',
      })
      .then(setWordExplanation)
      .catch((err) => {
        console.error('Failed to explain text', err);
        setWordExplanation({
          word: targetText,
          phonetic: null,
          direct_translation: 'Gagal memuat terjemahan',
          contextual_explanation: 'Terjadi kesalahan saat menghubungi layanan terjemahan AI.',
          example_usage: null,
          provider_used: 'gemini',
          is_cached: false,
        });
      })
      .finally(() => setIsLoadingExplanation(false));
  };

  const handleSaveVocabulary = async (
    word: string,
    context: string,
    translation: string,
    explanation: string
  ) => {
    await api.saveVocabulary({
      book_id: book.id,
      word,
      sentence_context: context,
      translation,
      ai_explanation: explanation,
    });
  };

  // Toggle View Mode
  const toggleViewMode = () => {
    const next = viewMode === 'book' ? 'scroll' : 'book';
    setViewMode(next);
    localStorage.setItem('epub_reader_view_mode', next);
  };

  // Toggle Theme
  const toggleTheme = () => {
    if (propToggleTheme) {
      propToggleTheme();
    } else {
      setLocalTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    }
  };

  // Published Chapter Title
  const currentChapterTitle =
    chapterData?.title ||
    book.table_of_contents?.find((t) => t.index === currentChapterIndex)?.title ||
    `Chapter ${currentChapterIndex + 1}`;

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDark ? 'bg-[#181614] text-[#E8E2D9]' : 'bg-[#F5EFEB] text-[#2D2825]'
      } flex flex-col font-sans`}
    >
      {/* Top Header Bar */}
      <header
        className={`sticky top-0 z-40 bg-inherit/95 backdrop-blur-md border-b ${
          isDark ? 'border-white/10' : 'border-black/10'
        } px-4 md:px-6 py-2.5 transition-all flex items-center justify-between shadow-xs`}
      >
        {/* Left: Back button & Book/Chapter Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToLibrary}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${
              isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
            } transition-colors`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Library</span>
          </button>
          <div className={`border-l ${isDark ? 'border-white/10' : 'border-black/10'} pl-3`}>
            <h2 className="text-xs font-bold truncate max-w-[180px] md:max-w-xs">
              {book.title}
            </h2>
            <p className="text-[11px] text-[#D3746B] font-semibold truncate max-w-[180px] md:max-w-xs">
              {currentChapterTitle}
            </p>
          </div>
        </div>

        {/* Right: Controls & Toggles */}
        <div className="flex items-center gap-1.5">
          {/* Bookmark Button */}
          <button
            onClick={handleToggleBookmark}
            title={isCurrentBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
            className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              isCurrentBookmarked
                ? 'bg-[#D3746B]/20 text-[#D3746B] border border-[#D3746B]/30'
                : `opacity-60 hover:opacity-100 ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`
            }`}
          >
            <Bookmark
              className={`w-4 h-4 ${isCurrentBookmarked ? 'fill-[#D3746B]' : ''}`}
            />
          </button>

          {/* Theme Toggle: Light / Dark */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`p-2 rounded-xl opacity-60 hover:opacity-100 ${
              isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
            } transition-all`}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#2D2825]" />
            )}
          </button>

          {/* Mode Toggle: Book vs Scroll */}
          <button
            onClick={toggleViewMode}
            title={
              viewMode === 'book'
                ? 'Switch to Scroll Mode'
                : 'Switch to 2-Page Book Mode'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold ${
              isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'
            } opacity-80 hover:opacity-100 transition-all`}
          >
            {viewMode === 'book' ? (
              <>
                <BookOpen className="w-3.5 h-3.5 text-[#D3746B]" />
                <span className="hidden md:inline">Book Mode</span>
              </>
            ) : (
              <>
                <Scroll className="w-3.5 h-3.5 text-[#4B8B9B]" />
                <span className="hidden md:inline">Scroll Mode</span>
              </>
            )}
          </button>

          {/* Table of Contents & Bookmarks Drawer Toggle */}
          <button
            onClick={() => setIsTocOpen(true)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl ${
              isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
            } transition-colors`}
          >
            <List className="w-4 h-4" />
            <span className="hidden lg:inline">Contents</span>
          </button>

          {/* Reader Typography Settings Toggle */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2 rounded-xl opacity-60 hover:opacity-100 ${
              isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
            } transition-colors`}
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Reading Canvas */}
      <main className="flex-1 flex flex-col justify-center items-center overflow-hidden relative">
        {isLoadingChapter ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32">
            <Loader2 className="w-8 h-8 text-[#D3746B] animate-spin" />
            <p className="text-xs opacity-60">Opening chapter...</p>
          </div>
        ) : viewMode === 'book' ? (
          // ==================== BOOK MODE (2-PAGE SPREAD) ====================
          <div className="w-full flex-1 flex flex-col items-center justify-center p-2 md:p-6 overflow-hidden">
            {/* Book Frame with Spine Shadow */}
            <div
              ref={bookViewportRef}
              className={`relative w-full max-w-6xl h-[calc(100vh-135px)] rounded-2xl shadow-2xl border ${
                isDark
                  ? 'bg-[#1E1B18] text-[#E8E2D9] border-white/10'
                  : 'bg-[#FAF6F0] text-[#2D2825] border-black/10'
              } overflow-hidden flex flex-col`}
            >
              {/* Subtle Middle Spine Shadow for physical book realism */}
              <div
                className={`hidden md:block absolute left-1/2 top-0 bottom-0 w-12 -translate-x-1/2 pointer-events-none z-20 bg-gradient-to-r from-black/0 ${
                  isDark ? 'via-black/50' : 'via-black/10'
                } to-black/0`}
              />

              {/* Edge Page Flip Buttons (Clean chevrons, strictly turns pages) */}
              <button
                onClick={handlePrevPageSpread}
                disabled={currentPage === 0}
                title="Previous Page"
                className={`absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full ${
                  isDark ? 'bg-white/5' : 'bg-black/5'
                } hover:bg-[#D3746B] hover:text-white transition-all opacity-40 hover:opacity-100 disabled:opacity-10`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextPageSpread}
                disabled={currentPage + 2 >= totalPages}
                title="Next Page"
                className={`absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full ${
                  isDark ? 'bg-white/5' : 'bg-black/5'
                } hover:bg-[#D3746B] hover:text-white transition-all opacity-40 hover:opacity-100 disabled:opacity-10`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Paginated Columns Container (Padded inner viewport) */}
              <div
                className="flex-1 overflow-hidden px-8 md:px-14 py-8"
                onMouseUp={handleContentMouseUp}
              >
                <div
                  ref={setBookColumnsRef}
                  style={{
                    transform: `translateX(-${
                      (currentPage / 2) *
                      ((columnViewportWidth || bookColumnsContainerRef.current?.clientWidth || 0) +
                        COLUMN_GAP_PX)
                    }px)`,
                    columnCount: 2,
                    columnGap: `${COLUMN_GAP_PX}px`,
                    columnFill: 'auto',
                    height: '100%',
                    width: '100%',
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineHeight,
                  }}
                  className={`epub-content transition-transform duration-300 ease-out select-text text-justify font-${
                    settings.fontFamily
                  } ${isDark ? 'text-[#E8E2D9]' : 'text-[#2D2825]'}`}
                >
                  {/* Left Page Highlighted Chapter Header on Page 0 */}
                  <div
                    className={`mb-6 pb-4 border-b ${
                      isDark ? 'border-white/10' : 'border-black/10'
                    } text-center select-none`}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#D3746B] block">
                      {book.title}
                    </span>
                    <h1
                      className={`text-2xl md:text-3xl font-extrabold mt-1 tracking-tight ${
                        isDark ? 'text-[#E8E2D9]' : 'text-[#2D2825]'
                      }`}
                    >
                      {currentChapterTitle}
                    </h1>
                  </div>

                  {/* Chapter Inlined HTML Content */}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: chapterData?.content_html || '',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // ==================== SCROLL MODE ====================
          <div
            className={`w-full max-w-3xl px-6 md:px-12 py-10 overflow-y-auto select-text ${
              isDark ? 'text-[#E8E2D9]' : 'text-[#2D2825]'
            }`}
            onMouseUp={handleContentMouseUp}
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
            }}
          >
            {/* Chapter Header Banner */}
            <div
              className={`mb-8 pb-4 border-b ${
                isDark ? 'border-white/10' : 'border-black/10'
              } text-center select-none`}
            >
              <span className="text-xs font-bold uppercase tracking-widest text-[#D3746B] block">
                {book.title}
              </span>
              <h1
                className={`text-2xl md:text-3xl font-extrabold mt-2 tracking-tight ${
                  isDark ? 'text-[#E8E2D9]' : 'text-[#2D2825]'
                }`}
              >
                {currentChapterTitle}
              </h1>
            </div>

            {/* Inlined Chapter HTML Content */}
            <div
              className={`epub-content font-${settings.fontFamily}`}
              dangerouslySetInnerHTML={{
                __html: chapterData?.content_html || '',
              }}
            />
          </div>
        )}
      </main>

      {/* Bottom Footer Bar: Dedicated Chapter Navigation & Page Progress */}
      <footer
        className={`sticky bottom-0 z-40 bg-inherit/95 backdrop-blur-md border-t ${
          isDark ? 'border-white/10' : 'border-black/10'
        } px-6 py-2.5 flex items-center justify-between text-xs font-semibold shadow-xs`}
      >
        {/* Prev Chapter Button */}
        <button
          onClick={handlePrevChapter}
          disabled={currentChapterIndex === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold ${
            isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
          } transition-colors disabled:opacity-30`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Prev Chapter</span>
        </button>

        {/* Page / Progress Display */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold tracking-tight">
            {viewMode === 'book'
              ? `Page ${currentPage + 1}-${Math.min(currentPage + 2, Math.max(2, totalPages))} of ${Math.max(2, totalPages)}`
              : `Chapter ${currentChapterIndex + 1} of ${book.total_chapters}`}
          </span>
          <div
            className={`w-36 md:w-56 h-1 ${
              isDark ? 'bg-white/10' : 'bg-black/10'
            } rounded-full overflow-hidden`}
          >
            <div
              className="h-full bg-[#D3746B] transition-all duration-300"
              style={{
                width: `${
                  viewMode === 'book'
                    ? ((currentPage + 2) / Math.max(2, totalPages)) * 100
                    : ((currentChapterIndex + 1) / book.total_chapters) * 100
                }%`,
              }}
            />
          </div>
        </div>

        {/* Next Chapter Button */}
        <button
          onClick={handleNextChapter}
          disabled={currentChapterIndex === book.total_chapters - 1}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold ${
            isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
          } transition-colors disabled:opacity-30`}
        >
          <span>Next Chapter</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

      {/* 1-Click Definition & AI Nuance Modal */}
      {selectedWord && (
        <WordCardModal
          word={selectedWord}
          sentenceContext={sentenceContext}
          explanation={wordExplanation}
          isLoading={isLoadingExplanation}
          position={lookupPosition}
          onClose={() => {
            setSelectedWord(null);
            setWordExplanation(null);
            setLookupPosition(null);
          }}
          onSaveVocabulary={handleSaveVocabulary}
        />
      )}

      {/* Table of Contents & Bookmarks Drawer */}
      <TableOfContents
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        toc={book.table_of_contents || []}
        currentChapterIndex={currentChapterIndex}
        onSelectChapter={(index) => {
          setPendingNavTarget('start');
          setCurrentChapterIndex(index);
          setCurrentPage(0);
        }}
        bookTitle={book.title}
        bookmarks={bookmarks}
        onSelectBookmark={(bm) => {
          setPendingNavTarget('start');
          setCurrentChapterIndex(bm.chapter_index);
          setCurrentPage(bm.page_number - 1);
        }}
        onDeleteBookmark={async (bmId) => {
          try {
            await api.deleteBookmark(book.id, bmId);
            setBookmarks((prev) => prev.filter((b) => b.id !== bmId));
          } catch (err) {
            console.error('Failed to delete bookmark', err);
          }
        }}
      />

      {/* Typography & Reading Settings Modal */}
      <ReaderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) =>
          setSettings((prev) => ({ ...prev, ...newSettings }))
        }
      />
    </div>
  );
};
