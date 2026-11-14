import React, { useState, useEffect } from 'react';
import { BookResponseDto, BookDetailDto, VocabularyResponseDto } from './types/api';
import { api } from './services/api';
import { Navbar } from './components/common/Navbar';
import { LibraryView } from './components/Library/LibraryView';
import { ReaderView } from './components/Reader/ReaderView';
import { VocabularyList } from './components/Vocabulary/VocabularyList';
import { UploadModal } from './components/Library/UploadModal';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'library' | 'vocabulary'>('library');
  const [activeBook, setActiveBook] = useState<BookDetailDto | null>(null);
  const [books, setBooks] = useState<BookResponseDto[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyResponseDto[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [isLoadingVocab, setIsLoadingVocab] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Global Theme: 'light' or 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('epub_reader_theme') as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('epub_reader_theme', theme);
  }, [theme]);

  // Fetch books on load
  const loadBooks = async () => {
    setIsLoadingBooks(true);
    try {
      const data = await api.listBooks();
      setBooks(data);
    } catch (err) {
      console.error('Failed to load books', err);
    } finally {
      setIsLoadingBooks(false);
    }
  };

  // Fetch vocabulary
  const loadVocabulary = async () => {
    setIsLoadingVocab(true);
    try {
      const data = await api.listVocabulary();
      setVocabulary(data);
    } catch (err) {
      console.error('Failed to load vocabulary', err);
    } finally {
      setIsLoadingVocab(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (currentTab === 'vocabulary') {
      loadVocabulary();
    }
  }, [currentTab]);

  const handleOpenBook = async (bookId: string) => {
    try {
      const detail = await api.getBookDetail(bookId);
      setActiveBook(detail);
    } catch (err) {
      console.error('Failed to open book', err);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      await api.deleteBook(bookId);
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
    } catch (err) {
      console.error('Failed to delete book', err);
    }
  };

  const handleUploadComplete = async (file: File) => {
    await api.uploadBook(file);
    await loadBooks();
  };

  // If a book is actively open, render the ReaderView
  if (activeBook) {
    return (
      <ReaderView
        book={activeBook}
        theme={theme}
        onToggleTheme={toggleTheme}
        onBackToLibrary={() => {
          setActiveBook(null);
          loadBooks(); // refresh reading progress
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#141210] text-[#E8E2D9]' : 'bg-parchment text-espresso'} flex flex-col font-sans transition-colors duration-200`}>
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenUpload={() => setIsUploadOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="flex-1">
        {currentTab === 'library' ? (
          <LibraryView
            books={books}
            isLoading={isLoadingBooks}
            onOpenBook={handleOpenBook}
            onDeleteBook={handleDeleteBook}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        ) : (
          <VocabularyList
            vocabulary={vocabulary}
            isLoading={isLoadingVocab}
          />
        )}
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUploadComplete}
      />
    </div>
  );
};
export default App;

