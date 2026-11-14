const dotenv = require('dotenv');
dotenv.config();

class AiService {
  constructor(database) {
    this.db = database;
    this.provider = process.env.AI_PROVIDER || 'gemini';
    this.geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
    this.geminiModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    this.localUrl = process.env.LOCAL_MODEL_URL || 'http://127.0.0.1:11434/api/generate';
    this.localModel = process.env.LOCAL_MODEL_NAME || 'qwen2.5:1.5b';
  }

  async explainWord(word, sentenceContext, targetLang = 'id') {
    // 1. Check SQLite word_cache
    const cached = this.db.get(
      'SELECT direct_translation, contextual_explanation, phonetic, example_usage FROM word_cache WHERE word = ? AND target_lang = ?',
      [word.toLowerCase().trim(), targetLang]
    );

    if (cached) {
      return {
        word,
        phonetic: cached.phonetic,
        direct_translation: cached.direct_translation,
        contextual_explanation: cached.contextual_explanation,
        example_usage: cached.example_usage,
      };
    }

    // 2. If Gemini API key is missing or blank -> graceful offline fallback
    if (this.provider === 'gemini' && !this.geminiApiKey) {
      return {
        word,
        phonetic: null,
        direct_translation: `[Translation of '${word}' to ${targetLang}]`,
        contextual_explanation: `In this sentence ("${sentenceContext}"), '${word}' is used in context. (Add GEMINI_API_KEY to .env for full AI definitions).`,
        example_usage: sentenceContext,
      };
    }

    let result = null;
    if (this.provider === 'local') {
      result = await this.callLocalModel(word, sentenceContext, targetLang);
    } else {
      result = await this.callGemini(word, sentenceContext, targetLang);
    }

    // 3. Cache result in SQLite
    try {
      this.db.run(
        `INSERT OR REPLACE INTO word_cache (word, target_lang, direct_translation, contextual_explanation, phonetic, example_usage, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          word.toLowerCase().trim(),
          targetLang,
          result.direct_translation,
          result.contextual_explanation,
          result.phonetic || null,
          result.example_usage || null,
          new Date().toISOString(),
        ]
      );
    } catch (err) {
      console.error('Failed to cache word definition in SQLite:', err);
    }

    return result;
  }

  async translateWord(word, targetLang = 'id') {
    const explanation = await this.explainWord(word, word, targetLang);
    return explanation.direct_translation;
  }

  async callGemini(word, sentenceContext, targetLang) {
    const langName = targetLang === 'id' ? 'Indonesian' : targetLang === 'es' ? 'Spanish' : targetLang === 'fr' ? 'French' : 'Indonesian';
    const isSentence = word.trim().split(/\s+/).length > 3;

    const prompt = isSentence
      ? `You are an expert bilingual reading companion. Translate the following sentence into natural, fluent ${langName}:
Sentence: "${word}"
Return ONLY valid JSON with keys:
"direct_translation": (string) fluent ${langName} translation,
"contextual_explanation": (string) brief note on nuance in 1 sentence.`
      : `You are an expert lexicographer and literary reading companion.
Word: "${word}"
Original sentence context: "${sentenceContext}"
Target language: ${langName}

Return ONLY valid JSON with keys:
"phonetic": (string, IPA phonetic spelling, e.g. "/.../"),
"direct_translation": (string, concise ${langName} translation for this context),
"contextual_explanation": (string, 1-2 sentence explanation in ${langName} of its exact nuance and meaning in this context),
"example_usage": (string, natural example sentence in English).`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    try {
      const parsed = JSON.parse(text);
      return {
        word,
        phonetic: parsed.phonetic || null,
        direct_translation: parsed.direct_translation || word,
        contextual_explanation: parsed.contextual_explanation || 'Explanation unavailable',
        example_usage: parsed.example_usage || sentenceContext,
      };
    } catch {
      return {
        word,
        phonetic: null,
        direct_translation: word,
        contextual_explanation: text,
        example_usage: sentenceContext,
      };
    }
  }

  async callLocalModel(word, sentenceContext, targetLang) {
    try {
      const response = await fetch(this.localUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.localModel,
          prompt: `Word: ${word}\nSentence: ${sentenceContext}\nExplain in ${targetLang} in 2 sentences.`,
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          word,
          phonetic: null,
          direct_translation: `${word} (local)`,
          contextual_explanation: data.response || 'Local model explanation',
          example_usage: sentenceContext,
        };
      }
    } catch (err) {
      console.warn('Local Ollama endpoint unreachable:', err.message);
    }

    return {
      word,
      phonetic: null,
      direct_translation: `${word} (offline)`,
      contextual_explanation: `In this sentence ("${sentenceContext}"), '${word}' is used in context.`,
      example_usage: sentenceContext,
    };
  }
}

module.exports = { AiService };

