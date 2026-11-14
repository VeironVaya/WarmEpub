const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');
const path = require('path');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
});

function extractText(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'object') {
    if (val['#text'] !== undefined) return extractText(val['#text'], fallback);
    for (const k of Object.keys(val)) {
      if (!k.startsWith('@_')) {
        return extractText(val[k], fallback);
      }
    }
  }
  return fallback;
}

function resolveRelativePath(baseDir, relativePath) {
  const cleanPath = relativePath.split('?')[0].split('#')[0];
  let parts = baseDir ? baseDir.split('/') : [];
  for (const segment of cleanPath.split('/')) {
    if (segment === '.' || !segment) continue;
    if (segment === '..') {
      parts.pop();
    } else {
      parts.push(segment);
    }
  }
  return parts.join('/');
}

function collectNavPoints(node, list = []) {
  if (!node) return list;
  const points = Array.isArray(node) ? node : [node];
  for (const pt of points) {
    const text = extractText(pt?.navLabel?.text);
    const src = pt?.content?.['@_src'] || '';
    if (src && text && text.trim() !== '^') {
      list.push({ title: text.trim(), src });
    }
    if (pt.navPoint) {
      collectNavPoints(pt.navPoint, list);
    }
  }
  return list;
}

class EpubParser {
  static parse(buffer) {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const entryMap = new Map();
    for (const e of entries) {
      entryMap.set(e.entryName.replace(/\\/g, '/'), e);
    }

    // 1. Locate rootfile from META-INF/container.xml
    const containerEntry = entryMap.get('META-INF/container.xml');
    if (!containerEntry) {
      throw new Error('Invalid EPUB: META-INF/container.xml not found');
    }

    const containerXml = containerEntry.getData().toString('utf8');
    const containerObj = xmlParser.parse(containerXml);
    let opfPath = '';

    const rootfiles = containerObj?.container?.rootfiles?.rootfile;
    if (Array.isArray(rootfiles)) {
      opfPath = rootfiles[0]?.['@_full-path'] || '';
    } else if (rootfiles) {
      opfPath = rootfiles['@_full-path'] || '';
    }

    if (!opfPath) {
      for (const name of entryMap.keys()) {
        if (name.endsWith('.opf')) {
          opfPath = name;
          break;
        }
      }
    }

    const opfEntry = entryMap.get(opfPath) || entryMap.get(decodeURIComponent(opfPath));
    if (!opfEntry) {
      throw new Error(`OPF rootfile not found at ${opfPath}`);
    }

    const opfDir = path.posix.dirname(opfPath) === '.' ? '' : path.posix.dirname(opfPath);
    const opfXml = opfEntry.getData().toString('utf8');
    const opfObj = xmlParser.parse(opfXml);

    const packageNode = opfObj?.package || opfObj;
    const metadata = packageNode?.metadata || {};
    const manifest = packageNode?.manifest || {};
    const spine = packageNode?.spine || {};

    const title = extractText(metadata.title, 'Untitled Book');
    let author = 'Unknown Author';
    if (Array.isArray(metadata.creator)) {
      author = metadata.creator.map(c => extractText(c)).filter(Boolean).join(', ') || author;
    } else if (metadata.creator) {
      author = extractText(metadata.creator, author);
    }

    const language = extractText(metadata.language, 'en');
    const description = metadata.description ? extractText(metadata.description) : null;

    // Manifest: id -> { href, mediaType, properties }
    const manifestMap = new Map();
    const manifestItems = Array.isArray(manifest.item) ? manifest.item : manifest.item ? [manifest.item] : [];
    for (const item of manifestItems) {
      const id = item['@_id'];
      const href = item['@_href'];
      const mediaType = item['@_media-type'];
      const properties = item['@_properties'] || '';
      if (id && href) {
        manifestMap.set(id, { href, mediaType, properties });
      }
    }

    // Spine: ordered itemrefs
    const spineItems = Array.isArray(spine.itemref) ? spine.itemref : spine.itemref ? [spine.itemref] : [];
    const spineHrefs = [];
    for (const ref of spineItems) {
      const idref = ref['@_idref'];
      const item = manifestMap.get(idref);
      if (item) {
        const fullHref = resolveRelativePath(opfDir, item.href);
        spineHrefs.push(fullHref);
      }
    }

    // Cover image extraction
    let coverBuffer = null;
    let coverExt = 'jpg';
    let coverHref = null;

    // A. Check properties="cover-image"
    for (const item of manifestMap.values()) {
      if (item.properties && item.properties.includes('cover-image')) {
        coverHref = resolveRelativePath(opfDir, item.href);
        break;
      }
    }

    // B. Check meta[name="cover"]
    if (!coverHref && metadata.meta) {
      const metas = Array.isArray(metadata.meta) ? metadata.meta : [metadata.meta];
      const coverMeta = metas.find(m => m['@_name'] === 'cover');
      if (coverMeta) {
        const coverItem = manifestMap.get(coverMeta['@_content']);
        if (coverItem) {
          coverHref = resolveRelativePath(opfDir, coverItem.href);
        }
      }
    }

    // C. Fallback: item with id or href containing 'cover' and image media-type
    if (!coverHref) {
      for (const [id, item] of manifestMap.entries()) {
        if (
          item.mediaType &&
          item.mediaType.startsWith('image/') &&
          (id.toLowerCase().includes('cover') || item.href.toLowerCase().includes('cover'))
        ) {
          coverHref = resolveRelativePath(opfDir, item.href);
          break;
        }
      }
    }

    if (coverHref) {
      const coverEntry = entryMap.get(coverHref) || entryMap.get(decodeURIComponent(coverHref));
      if (coverEntry) {
        coverBuffer = coverEntry.getData();
        coverExt = path.posix.extname(coverHref).replace('.', '').toLowerCase() || 'jpg';
      }
    }

    // Collect Navigation Items (NCX and/or EPUB3 Nav)
    const navList = [];
    let ncxHref = null;
    for (const item of manifestMap.values()) {
      if (item.mediaType === 'application/x-dtbncx+xml' || item.href.endsWith('.ncx')) {
        ncxHref = resolveRelativePath(opfDir, item.href);
        break;
      }
    }

    if (ncxHref) {
      const ncxEntry = entryMap.get(ncxHref) || entryMap.get(decodeURIComponent(ncxHref));
      if (ncxEntry) {
        try {
          const ncxXml = ncxEntry.getData().toString('utf8');
          const ncxObj = xmlParser.parse(ncxXml);
          const ncxDir = path.posix.dirname(ncxHref) === '.' ? '' : path.posix.dirname(ncxHref);
          const points = collectNavPoints(ncxObj?.ncx?.navMap?.navPoint);
          for (const pt of points) {
            navList.push({
              title: pt.title,
              src: resolveRelativePath(ncxDir, pt.src),
            });
          }
        } catch (e) {
          console.warn('NCX parsing warning:', e.message);
        }
      }
    }

    // EPUB3 Nav document fallback if navList is empty
    if (navList.length === 0) {
      let navDocHref = null;
      for (const item of manifestMap.values()) {
        if (item.properties && item.properties.includes('nav')) {
          navDocHref = resolveRelativePath(opfDir, item.href);
          break;
        }
      }
      if (navDocHref) {
        const navEntry = entryMap.get(navDocHref) || entryMap.get(decodeURIComponent(navDocHref));
        if (navEntry) {
          try {
            const navHtml = navEntry.getData().toString('utf8');
            const navDir = path.posix.dirname(navDocHref) === '.' ? '' : path.posix.dirname(navDocHref);
            const aRegex = /<a\s+[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let match;
            while ((match = aRegex.exec(navHtml)) !== null) {
              const rawHref = match[1];
              const text = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
              if (text && text !== '^' && rawHref) {
                navList.push({
                  title: text,
                  src: resolveRelativePath(navDir, rawHref),
                });
              }
            }
          } catch (e) {
            console.warn('Nav doc error:', e.message);
          }
        }
      }
    }

    // Build 1:1 Table of Contents mapping every spine item
    const tableOfContents = [];
    let foundFirstNumberedChapter = false;

    for (let idx = 0; idx < spineHrefs.length; idx++) {
      const href = spineHrefs[idx];
      const cleanSpine = decodeURIComponent(href.split('#')[0]);
      const spineBase = path.posix.basename(cleanSpine);

      // Match against navList
      let matchedNav = navList.find(n => {
        const cleanNav = decodeURIComponent(n.src.split('#')[0]);
        return cleanSpine === cleanNav || cleanSpine.endsWith(cleanNav) || cleanNav.endsWith(cleanSpine);
      });

      if (!matchedNav) {
        matchedNav = navList.find(n => {
          const navBase = path.posix.basename(decodeURIComponent(n.src.split('#')[0]));
          return spineBase === navBase;
        });
      }

      let chapterTitleCandidate = matchedNav ? matchedNav.title : null;

      // Heading extraction from XHTML if not matched
      const entry = entryMap.get(cleanSpine) || entryMap.get(href);
      let bodyTextClean = '';
      if (entry) {
        try {
          const html = entry.getData().toString('utf8');
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          bodyTextClean = (bodyMatch ? bodyMatch[1] : html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

          if (!chapterTitleCandidate) {
            // Check h1, h2, h3
            const hMatch = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
            if (hMatch) {
              const cleanH = hMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
              if (cleanH && cleanH.length > 1 && cleanH.length < 80) {
                chapterTitleCandidate = cleanH;
              }
            }

            // Check title tag (if distinct from overall book title)
            if (!chapterTitleCandidate) {
              const tMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
              if (tMatch) {
                const cleanT = tMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                if (
                  cleanT &&
                  cleanT.toLowerCase() !== title.toLowerCase() &&
                  !cleanT.toLowerCase().includes(title.toLowerCase()) &&
                  cleanT.length > 1 &&
                  cleanT.length < 80
                ) {
                  chapterTitleCandidate = cleanT;
                }
              }
            }
          }
        } catch {}
      }

      // Keyword heuristics based on filename, position, and body content
      if (!chapterTitleCandidate) {
        const lower = spineBase.toLowerCase();
        if (idx === 0 || lower.includes('cover')) {
          chapterTitleCandidate = 'Cover';
        } else if (lower.includes('title') || lower.includes('tp')) {
          chapterTitleCandidate = 'Title Page';
        } else if (lower.includes('atb') || lower.includes('about')) {
          chapterTitleCandidate = 'About the Book';
        } else if (lower.includes('con') || lower.includes('toc')) {
          chapterTitleCandidate = 'Contents';
        } else if (lower.includes('ded')) {
          chapterTitleCandidate = 'Dedication';
        } else if (lower.includes('br0') || lower.includes('brand') || lower.includes('imprint')) {
          chapterTitleCandidate = 'Publisher Information';
        } else if (lower.includes('pro') || lower.includes('prologue')) {
          chapterTitleCandidate = 'Prologue';
        } else if (lower.includes('epi') || lower.includes('epilogue')) {
          chapterTitleCandidate = 'Epilogue';
        } else if (lower.includes('acknowledg')) {
          chapterTitleCandidate = 'Acknowledgments';
        } else if (lower.includes('bm') || lower.includes('afterword')) {
          chapterTitleCandidate = 'Afterword / Back Matter';
        } else {
          // Extract chapter number if present in filename (e.g. ch01, ch_01, chapter-2)
          const chNumMatch = lower.match(/(?:ch|chapter)[-_0]*(\d+[a-z]?)/i);
          if (chNumMatch) {
            chapterTitleCandidate = `Chapter ${chNumMatch[1].toUpperCase()}`;
          } else if (!foundFirstNumberedChapter && idx < 10) {
            // Front matter classification by body text
            const lowerBody = bodyTextClean.toLowerCase().slice(0, 160);
            if (lowerBody.includes('contents') || lowerBody.includes('table of contents')) {
              chapterTitleCandidate = 'Contents';
            } else if (lowerBody.includes('dedicat') || lowerBody.startsWith('to ')) {
              chapterTitleCandidate = 'Dedication';
            } else if (lowerBody.includes('other books') || lowerBody.includes('books by')) {
              chapterTitleCandidate = 'Other Works';
            } else if (lowerBody.includes('edition') || lowerBody.includes('published by') || lowerBody.includes('copyright')) {
              chapterTitleCandidate = 'Publication Info';
            } else if (idx === 1) {
              chapterTitleCandidate = 'Title Page';
            } else {
              chapterTitleCandidate = 'Front Matter';
            }
          } else {
            chapterTitleCandidate = `Chapter ${idx + 1}`;
          }
        }
      }

      if (
        chapterTitleCandidate &&
        (chapterTitleCandidate.toLowerCase().includes('chapter') ||
          chapterTitleCandidate.toLowerCase().includes('prologue'))
      ) {
        foundFirstNumberedChapter = true;
      }

      tableOfContents.push({
        index: idx,
        title: chapterTitleCandidate,
        href,
        play_order: idx + 1,
      });
    }

    return {
      title,
      author,
      language,
      description,
      coverBuffer,
      coverExt,
      spineHrefs,
      tableOfContents,
      totalChapters: spineHrefs.length,
    };
  }

  static readChapter(buffer, chapterHref) {
    const zip = new AdmZip(buffer);
    const cleanHref = decodeURIComponent(chapterHref.split('#')[0]);
    const chapterDir = path.posix.dirname(cleanHref) === '.' ? '' : path.posix.dirname(cleanHref);

    let entry = zip.getEntry(cleanHref) || zip.getEntry(chapterHref);
    if (!entry) {
      const entries = zip.getEntries();
      for (const e of entries) {
        const entryName = e.entryName.replace(/\\/g, '/');
        if (
          entryName === cleanHref ||
          entryName.endsWith(cleanHref) ||
          cleanHref.endsWith(entryName) ||
          decodeURIComponent(entryName) === cleanHref ||
          path.posix.basename(entryName) === path.posix.basename(cleanHref)
        ) {
          entry = e;
          break;
        }
      }
    }

    if (!entry) {
      throw new Error(`Chapter not found: ${chapterHref}`);
    }

    let xhtml = entry.getData().toString('utf8');

    // Inline images: match any src="..." or xlink:href="..." containing image extensions
    xhtml = xhtml.replace(
      /(<(?:img|image|use)\s+[^>]*?(?:src|xlink:href|href)=["'])([^"']+)(["'][^>]*?>)/gi,
      (match, p1, src, p3) => {
        if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
          return match;
        }
        const imgPath = resolveRelativePath(chapterDir, src);
        const cleanImgPath = decodeURIComponent(imgPath.split('#')[0]);
        let imgEntry = zip.getEntry(cleanImgPath) || zip.getEntry(imgPath);
        if (!imgEntry) {
          const imgBase = path.posix.basename(cleanImgPath);
          for (const e of zip.getEntries()) {
            if (e.entryName.replace(/\\/g, '/').endsWith(imgBase)) {
              imgEntry = e;
              break;
            }
          }
        }

        if (imgEntry) {
          const ext = path.posix.extname(cleanImgPath).toLowerCase().replace('.', '');
          const mime =
            ext === 'png'
              ? 'image/png'
              : ext === 'gif'
              ? 'image/gif'
              : ext === 'svg'
              ? 'image/svg+xml'
              : ext === 'webp'
              ? 'image/webp'
              : 'image/jpeg';
          const b64 = imgEntry.getData().toString('base64');
          return `${p1}data:${mime};base64,${b64}${p3}`;
        }
        return match;
      }
    );

    // Strip dangerous <script> tags
    xhtml = xhtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Extract body content or strip outer html/body tags
    const bodyMatch = xhtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return bodyMatch ? bodyMatch[1] : xhtml;
  }
}

module.exports = { EpubParser };
