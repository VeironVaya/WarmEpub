const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { EpubParser } = require('./epubParser');
const { AiService } = require('./aiService');

function sendSuccess(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString(),
  });
}

function sendError(res, message, status = 500) {
  return res.status(status).json({
    success: false,
    data: null,
    error: typeof message === 'string' ? message : message?.message || 'Server error',
    timestamp: new Date().toISOString(),
  });
}

function createServer(db, storageDir, staticDir) {
  const app = express();
  const aiService = new AiService(db);

  const booksDir = path.join(storageDir, 'books');
  const coversDir = path.join(storageDir, 'covers');
  fs.mkdirSync(booksDir, { recursive: true });
  fs.mkdirSync(coversDir, { recursive: true });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  });

  app.use(cors());
  app.use(express.json());

  // ==================== BOOK ROUTES ====================
  // Upload Book
  app.post('/api/books', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }

      const fileBuffer = req.file.buffer;
      const parsed = EpubParser.parse(fileBuffer);
      const bookId = uuidv4();

      // Save EPUB file
      const bookFilePath = path.join(booksDir, `${bookId}.epub`);
      fs.writeFileSync(bookFilePath, fileBuffer);

      // Save Cover image
      let coverFilename = null;
      if (parsed.coverBuffer) {
        coverFilename = `${bookId}.${parsed.coverExt}`;
        fs.writeFileSync(path.join(coversDir, coverFilename), parsed.coverBuffer);
      }

      const now = new Date().toISOString();

      // Insert book into SQLite
      db.run(
        `INSERT INTO books (id, title, author, description, language, file_path, cover_image_path, total_chapters, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookId,
          parsed.title,
          parsed.author,
          parsed.description || null,
          parsed.language,
          bookFilePath,
          coverFilename,
          parsed.totalChapters,
          now,
          now,
        ]
      );

      // Insert chapters (1 per spine item)
      for (let i = 0; i < parsed.spineHrefs.length; i++) {
        const href = parsed.spineHrefs[i];
        const tocItem = parsed.tableOfContents[i];
        const chapTitle = tocItem ? tocItem.title : `Chapter ${i + 1}`;
        db.run(
          `INSERT OR REPLACE INTO chapters (book_id, chapter_index, title, href)
           VALUES (?, ?, ?, ?)`,
          [bookId, i, chapTitle, href]
        );
      }

      return sendSuccess(res, {
        id: bookId,
        title: parsed.title,
        author: parsed.author,
        description: parsed.description,
        language: parsed.language,
        cover_url: coverFilename ? `/api/books/${bookId}/cover` : null,
        total_chapters: parsed.totalChapters,
        current_chapter_index: 0,
        progress_percentage: 0.0,
        last_read_at: null,
        created_at: now,
      }, 201);
    } catch (err) {
      console.error('Upload book error:', err);
      return sendError(res, err.message || 'Failed to process EPUB', 500);
    }
  });

  // List all books
  app.get('/api/books', (req, res) => {
    try {
      const rows = db.query(`
        SELECT 
          b.id, b.title, b.author, b.description, b.language, b.cover_image_path, b.total_chapters, b.created_at,
          COALESCE(p.current_chapter_index, 0) as current_chapter_index,
          COALESCE(p.progress_percentage, 0.0) as progress_percentage,
          p.last_read_at
        FROM books b
        LEFT JOIN progress p ON b.id = p.book_id
        ORDER BY b.created_at DESC
      `);

      const books = rows.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        description: b.description,
        language: b.language || 'en',
        cover_url: b.cover_image_path ? `/api/books/${b.id}/cover` : null,
        total_chapters: b.total_chapters,
        current_chapter_index: b.current_chapter_index,
        progress_percentage: b.progress_percentage,
        last_read_at: b.last_read_at,
        created_at: b.created_at,
      }));

      return sendSuccess(res, books);
    } catch (err) {
      console.error('List books error:', err);
      return sendError(res, 'Failed to list books', 500);
    }
  });

  // Get single book detail
  app.get('/api/books/:id', (req, res) => {
    try {
      const book = db.get('SELECT * FROM books WHERE id = ?', [req.params.id]);
      if (!book) return sendError(res, 'Book not found', 404);

      const progress = db.get('SELECT * FROM progress WHERE book_id = ?', [req.params.id]);
      const chapters = db.query(
        'SELECT chapter_index as "index", title, href FROM chapters WHERE book_id = ? ORDER BY chapter_index ASC',
        [req.params.id]
      );

      return sendSuccess(res, {
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        language: book.language || 'en',
        cover_url: book.cover_image_path ? `/api/books/${book.id}/cover` : null,
        total_chapters: book.total_chapters,
        current_chapter_index: progress ? progress.current_chapter_index : 0,
        progress_percentage: progress ? progress.progress_percentage : 0.0,
        last_read_at: progress ? progress.last_read_at : null,
        table_of_contents: chapters.map((c, i) => ({
          index: c.index,
          title: c.title,
          href: c.href,
          play_order: i + 1,
        })),
        created_at: book.created_at,
      });
    } catch (err) {
      console.error('Get book detail error:', err);
      return sendError(res, 'Failed to get book detail', 500);
    }
  });

  // Get book cover image
  app.get('/api/books/:id/cover', (req, res) => {
    try {
      const book = db.get('SELECT cover_image_path FROM books WHERE id = ?', [req.params.id]);
      if (!book || !book.cover_image_path) {
        return res.status(404).send('Cover not found');
      }
      const coverPath = path.join(coversDir, book.cover_image_path);
      if (fs.existsSync(coverPath)) {
        res.sendFile(coverPath);
      } else {
        res.status(404).send('Cover file missing');
      }
    } catch (err) {
      res.status(500).send('Failed to read cover');
    }
  });

  // Delete book
  app.delete('/api/books/:id', (req, res) => {
    try {
      const book = db.get('SELECT file_path, cover_image_path FROM books WHERE id = ?', [req.params.id]);
      if (book) {
        if (book.file_path && fs.existsSync(book.file_path)) {
          try { fs.unlinkSync(book.file_path); } catch {}
        }
        if (book.cover_image_path) {
          const cPath = path.join(coversDir, book.cover_image_path);
          if (fs.existsSync(cPath)) {
            try { fs.unlinkSync(cPath); } catch {}
          }
        }
      }

      db.run('DELETE FROM chapters WHERE book_id = ?', [req.params.id]);
      db.run('DELETE FROM progress WHERE book_id = ?', [req.params.id]);
      db.run('DELETE FROM bookmarks WHERE book_id = ?', [req.params.id]);
      db.run('DELETE FROM books WHERE id = ?', [req.params.id]);

      return sendSuccess(res, { message: 'Book deleted successfully' });
    } catch (err) {
      console.error('Delete book error:', err);
      return sendError(res, 'Failed to delete book', 500);
    }
  });

  // ==================== READER & CHAPTER ROUTES ====================
  // Get Chapter
  app.get('/api/books/:id/chapters/:index', (req, res) => {
    try {
      const book = db.get('SELECT file_path, total_chapters FROM books WHERE id = ?', [req.params.id]);
      if (!book) return sendError(res, 'Book not found', 404);

      const chapterIndex = parseInt(req.params.index, 10);
      const chapter = db.get(
        'SELECT title, href FROM chapters WHERE book_id = ? AND chapter_index = ?',
        [req.params.id, chapterIndex]
      );

      if (!chapter) {
        return sendError(res, 'Chapter not found', 404);
      }

      if (!fs.existsSync(book.file_path)) {
        return sendError(res, 'EPUB file not found on disk', 404);
      }

      const epubBuffer = fs.readFileSync(book.file_path);
      const contentHtml = EpubParser.readChapter(epubBuffer, chapter.href);

      return sendSuccess(res, {
        index: chapterIndex,
        title: chapter.title,
        content_html: contentHtml,
        total_chapters: book.total_chapters,
      });
    } catch (err) {
      console.error('Get chapter error:', err);
      return sendError(res, err.message || 'Failed to read chapter', 500);
    }
  });

  // Update Progress
  app.put('/api/books/:id/progress', (req, res) => {
    try {
      const { current_chapter_index, progress_percentage } = req.body;
      const now = new Date().toISOString();

      db.run(
        `INSERT OR REPLACE INTO progress (book_id, current_chapter_index, progress_percentage, last_read_at)
         VALUES (?, ?, ?, ?)`,
        [req.params.id, current_chapter_index || 0, progress_percentage || 0.0, now]
      );

      return sendSuccess(res, {
        book_id: req.params.id,
        current_chapter_index: current_chapter_index || 0,
        progress_percentage: progress_percentage || 0.0,
        last_read_at: now,
      });
    } catch (err) {
      console.error('Update progress error:', err);
      return sendError(res, 'Failed to update progress', 500);
    }
  });

  // ==================== BOOKMARK ROUTES ====================
  // Create Bookmark
  app.post('/api/books/:id/bookmarks', (req, res) => {
    try {
      const { chapter_index, page_number, snippet } = req.body;
      const bookmarkId = uuidv4();
      const now = new Date().toISOString();

      db.run(
        `INSERT INTO bookmarks (id, book_id, chapter_index, page_number, snippet, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [bookmarkId, req.params.id, chapter_index, page_number || 1, snippet || '', now]
      );

      return sendSuccess(res, {
        id: bookmarkId,
        book_id: req.params.id,
        chapter_index,
        page_number: page_number || 1,
        snippet: snippet || '',
        created_at: now,
      }, 201);
    } catch (err) {
      console.error('Create bookmark error:', err);
      return sendError(res, 'Failed to create bookmark', 500);
    }
  });

  // List Bookmarks
  app.get('/api/books/:id/bookmarks', (req, res) => {
    try {
      const bookmarks = db.query(
        'SELECT * FROM bookmarks WHERE book_id = ? ORDER BY chapter_index ASC, page_number ASC',
        [req.params.id]
      );
      return sendSuccess(res, bookmarks);
    } catch (err) {
      console.error('List bookmarks error:', err);
      return sendError(res, 'Failed to list bookmarks', 500);
    }
  });

  // Delete Bookmark
  app.delete('/api/books/:id/bookmarks/:bookmark_id', (req, res) => {
    try {
      db.run('DELETE FROM bookmarks WHERE book_id = ? AND id = ?', [req.params.id, req.params.bookmark_id]);
      return sendSuccess(res, true);
    } catch (err) {
      console.error('Delete bookmark error:', err);
      return sendError(res, 'Failed to delete bookmark', 500);
    }
  });

  // ==================== DICTIONARY & AI ROUTES ====================
  // Translate
  app.post('/api/dictionary/translate', async (req, res) => {
    try {
      const { word, target_lang = 'id' } = req.body;
      if (!word) return sendError(res, 'Word required', 400);
      const translation = await aiService.translateWord(word, target_lang);
      return sendSuccess(res, { word, translation, target_lang });
    } catch (err) {
      console.error('Translate error:', err);
      return sendError(res, err.message || 'Translation failed', 500);
    }
  });

  // Explain
  app.post('/api/dictionary/explain', async (req, res) => {
    try {
      const { word, sentence_context = '', target_lang = 'id' } = req.body;
      if (!word) return sendError(res, 'Word required', 400);
      const explanation = await aiService.explainWord(word, sentence_context, target_lang);
      return sendSuccess(res, explanation);
    } catch (err) {
      console.error('Explain error:', err);
      return sendError(res, err.message || 'Explanation failed', 500);
    }
  });

  // ==================== VOCABULARY ROUTES ====================
  // Save Vocabulary
  app.post('/api/vocabulary', (req, res) => {
    try {
      const { word, sentence_context, translation, ai_explanation, book_title } = req.body;
      const vocabId = uuidv4();
      const now = new Date().toISOString();

      db.run(
        `INSERT INTO vocabulary (id, word, sentence_context, translation, ai_explanation, book_title, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [vocabId, word, sentence_context || '', translation || '', ai_explanation || '', book_title || null, now]
      );

      return sendSuccess(res, {
        id: vocabId,
        word,
        sentence_context,
        translation,
        ai_explanation,
        book_title,
        created_at: now,
      }, 201);
    } catch (err) {
      console.error('Save vocabulary error:', err);
      return sendError(res, 'Failed to save vocabulary', 500);
    }
  });

  // List Vocabulary
  app.get('/api/vocabulary', (req, res) => {
    try {
      const vocabulary = db.query('SELECT * FROM vocabulary ORDER BY created_at DESC');
      return sendSuccess(res, vocabulary);
    } catch (err) {
      console.error('List vocabulary error:', err);
      return sendError(res, 'Failed to list vocabulary', 500);
    }
  });

  // Seed sample books if database is empty
  let sampleBooksDir = path.join(__dirname, '..', '..', 'books');
  if (!fs.existsSync(sampleBooksDir) && process.resourcesPath) {
    sampleBooksDir = path.join(process.resourcesPath, 'books');
  }
  if (fs.existsSync(sampleBooksDir)) {
    try {
      const bookCount = db.get('SELECT COUNT(*) as cnt FROM books')?.cnt || 0;
      if (bookCount === 0) {
        console.log('Seeding sample books into SQLite database...');
        const files = fs.readdirSync(sampleBooksDir).filter(f => f.endsWith('.epub'));
        for (const file of files) {
          const filePath = path.join(sampleBooksDir, file);
          const buffer = fs.readFileSync(filePath);
          try {
            const parsed = EpubParser.parse(buffer);
            const bookId = uuidv4();
            const destBookPath = path.join(booksDir, `${bookId}.epub`);
            fs.writeFileSync(destBookPath, buffer);

            let coverFilename = null;
            if (parsed.coverBuffer) {
              coverFilename = `${bookId}.${parsed.coverExt}`;
              fs.writeFileSync(path.join(coversDir, coverFilename), parsed.coverBuffer);
            }

            const now = new Date().toISOString();
            db.run(
              `INSERT INTO books (id, title, author, description, language, file_path, cover_image_path, total_chapters, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [bookId, parsed.title, parsed.author, parsed.description || null, parsed.language, destBookPath, coverFilename, parsed.totalChapters, now, now]
            );

            for (let i = 0; i < parsed.spineHrefs.length; i++) {
              const href = parsed.spineHrefs[i];
              const tocItem = parsed.tableOfContents[i];
              const chapTitle = tocItem ? tocItem.title : `Chapter ${i + 1}`;
              db.run(
                `INSERT OR REPLACE INTO chapters (book_id, chapter_index, title, href)
                 VALUES (?, ?, ?, ?)`,
                [bookId, i, chapTitle, href]
              );
            }
            console.log(`Seeded: ${parsed.title}`);
          } catch (e) {
            console.warn(`Failed to seed ${file}:`, e.message);
          }
        }
      }
    } catch (e) {
      console.warn('Seeding check error:', e);
    }
  }

  // Auto-sync / repair existing books if titles are outdated or mismatched
  try {
    const existingBooks = db.query('SELECT id, title, file_path, total_chapters FROM books');
    for (const b of existingBooks) {
      let bookPath = b.file_path;
      if (!fs.existsSync(bookPath)) {
        const fallbackPath = path.join(booksDir, `${b.id}.epub`);
        if (fs.existsSync(fallbackPath)) {
          bookPath = fallbackPath;
        }
      }

      if (fs.existsSync(bookPath)) {
        const sampleChapters = db.query(
          'SELECT chapter_index, title, href FROM chapters WHERE book_id = ? ORDER BY chapter_index ASC LIMIT 30',
          [b.id]
        );
        const needsRepair =
          sampleChapters.some(
            (c) =>
              (c.href.includes('br01') && c.title.includes('Chapter')) ||
              (c.href.includes('fm02') && c.title.includes('Chapter 7')) ||
              (c.href.includes('titlepage') && c.title.includes('Chapter')) ||
              (c.href.includes('du01_001_00_010') && c.title.includes('Chapter 2')) ||
              (c.href.includes('split_002') && c.title === 'Acknowledgments')
          ) || sampleChapters.length < b.total_chapters;

        if (needsRepair) {
          console.log(`Repairing chapters for existing book: ${b.title}...`);
          const buf = fs.readFileSync(bookPath);
          const parsed = EpubParser.parse(buf);
          for (let i = 0; i < parsed.spineHrefs.length; i++) {
            const href = parsed.spineHrefs[i];
            const tocItem = parsed.tableOfContents[i];
            const chapTitle = tocItem ? tocItem.title : `Chapter ${i + 1}`;
            db.run(
              `INSERT OR REPLACE INTO chapters (book_id, chapter_index, title, href)
               VALUES (?, ?, ?, ?)`,
              [b.id, i, chapTitle, href]
            );
          }
          if (parsed.totalChapters !== b.total_chapters) {
            db.run('UPDATE books SET total_chapters = ? WHERE id = ?', [parsed.totalChapters, b.id]);
          }
          console.log(`Successfully repaired chapters for ${b.title}`);
        }
      }
    }
  } catch (err) {
    console.warn('Chapter auto-repair error:', err.message);
  }

  // ==================== STATIC FRONTEND SERVING ====================
  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  return app;
}

module.exports = { createServer };
