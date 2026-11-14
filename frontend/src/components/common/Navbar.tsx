import React from 'react';
import { BookOpen, BookmarkCheck, Upload, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  currentTab: 'library' | 'vocabulary';
  onSelectTab: (tab: 'library' | 'vocabulary') => void;
  onOpenUpload: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenUpload,
  theme,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';

  return (
    <header className="sticky top-0 z-30 bg-parchment/90 dark:bg-[#181614]/90 backdrop-blur-md border-b border-sandBorder dark:border-white/10 px-6 py-3.5 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <div 
          onClick={() => onSelectTab('library')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-terracotta flex items-center justify-center text-white shadow-warm group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-espresso dark:text-[#E8E2D9] flex items-center gap-1.5 transition-colors">
              WarmEpub
              <span className="text-[11px] font-semibold bg-terracotta-light dark:bg-terracotta/20 text-terracotta px-2 py-0.5 rounded-full">
                AI Reader
              </span>
            </h1>
            <p className="text-xs text-espresso-muted dark:text-[#9E968F] transition-colors">Distraction-free & Comforting</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-parchment-deep/60 dark:bg-white/5 p-1 rounded-2xl border border-sandBorder/70 dark:border-white/10 transition-colors">
          <button
            onClick={() => onSelectTab('library')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
              currentTab === 'library'
                ? 'bg-surface dark:bg-[#262320] text-espresso dark:text-[#E8E2D9] shadow-sm font-semibold'
                : 'text-espresso-muted dark:text-[#9E968F] hover:text-espresso dark:hover:text-[#E8E2D9]'
            }`}
          >
            <BookOpen className="w-4 h-4 text-terracotta" />
            Library
          </button>
          <button
            onClick={() => onSelectTab('vocabulary')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
              currentTab === 'vocabulary'
                ? 'bg-surface dark:bg-[#262320] text-espresso dark:text-[#E8E2D9] shadow-sm font-semibold'
                : 'text-espresso-muted dark:text-[#9E968F] hover:text-espresso dark:hover:text-[#E8E2D9]'
            }`}
          >
            <BookmarkCheck className="w-4 h-4 text-tealAccent" />
            Vocabulary
          </button>
        </nav>

        {/* Actions: Theme Toggle + Add Book */}
        <div className="flex items-center gap-2.5">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`p-2 rounded-xl transition-all ${
              isDark
                ? 'bg-white/5 hover:bg-white/10 text-amber-400'
                : 'bg-black/5 hover:bg-black/10 text-espresso'
            }`}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Add Book Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 bg-terracotta hover:bg-terracotta-hover text-white text-sm font-medium px-4 py-2 rounded-xl shadow-warm hover:shadow-warm-hover transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Add Book</span>
          </button>
        </div>
      </div>
    </header>
  );
};
