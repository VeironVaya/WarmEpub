const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class Database {
  constructor(dbFilePath) {
    this.dbFilePath = dbFilePath;
    this.db = null;
  }

  async init() {
    const SQL = await initSqlJs();
    const dir = path.dirname(this.dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.dbFilePath)) {
      const fileBuffer = fs.readFileSync(this.dbFilePath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.initSchema();
    this.save();
  }

  initSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        description TEXT,
        language TEXT,
        file_path TEXT NOT NULL,
        cover_image_path TEXT,
        total_chapters INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chapters (
        book_id TEXT NOT NULL,
        chapter_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        href TEXT NOT NULL,
        PRIMARY KEY (book_id, chapter_index)
      );

      CREATE TABLE IF NOT EXISTS progress (
        book_id TEXT PRIMARY KEY,
        current_chapter_index INTEGER NOT NULL DEFAULT 0,
        progress_percentage REAL NOT NULL DEFAULT 0.0,
        last_read_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        chapter_index INTEGER NOT NULL,
        page_number INTEGER NOT NULL DEFAULT 1,
        snippet TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vocabulary (
        id TEXT PRIMARY KEY,
        word TEXT NOT NULL,
        sentence_context TEXT NOT NULL,
        translation TEXT NOT NULL,
        ai_explanation TEXT NOT NULL,
        book_title TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS word_cache (
        word TEXT NOT NULL,
        target_lang TEXT NOT NULL,
        direct_translation TEXT NOT NULL,
        contextual_explanation TEXT NOT NULL,
        phonetic TEXT,
        example_usage TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (word, target_lang)
      );
    `);
  }

  save() {
    if (!this.db) return;
    const data = this.db.export();
    fs.writeFileSync(this.dbFilePath, Buffer.from(data));
  }

  query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  get(sql, params = []) {
    const rows = this.query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  run(sql, params = []) {
    this.db.run(sql, params);
    this.save();
  }
}

module.exports = { Database };

