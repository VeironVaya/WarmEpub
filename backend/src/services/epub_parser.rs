use crate::dtos::TocItemDto;
use crate::error::AppError;
use base64::{engine::general_purpose, Engine as _};
use quick_xml::events::Event;
use quick_xml::reader::Reader;
use std::collections::HashMap;
use std::io::{Cursor, Read};
use zip::ZipArchive;

#[derive(Debug, Clone)]
pub struct ParsedEpubMetadata {
    pub title: String,
    pub author: String,
    pub language: String,
    pub description: Option<String>,
    pub cover_image_bytes: Option<Vec<u8>>,
    pub cover_image_ext: String,
    pub spine_hrefs: Vec<String>,
    pub table_of_contents: Vec<TocItemDto>,
    pub total_chapters: usize,
}

pub struct EpubParser;

impl EpubParser {
    pub fn parse(epub_bytes: &[u8]) -> Result<ParsedEpubMetadata, AppError> {
        let cursor = Cursor::new(epub_bytes);
        let mut archive = ZipArchive::new(cursor)
            .map_err(|e| AppError::Epub(format!("Failed to open EPUB as zip: {e}")))?;

        // 1. Locate rootfile from META-INF/container.xml
        let opf_path = Self::find_opf_path(&mut archive)?;
        let opf_dir = if let Some(idx) = opf_path.rfind('/') {
            opf_path[..idx].to_string()
        } else {
            "".to_string()
        };

        // 2. Read OPF content
        let opf_content = Self::read_entry_string(&mut archive, &opf_path)?;

        // 3. Parse OPF XML for metadata, manifest, spine
        let (title, author, language, description, manifest, spine_ids, cover_id_hint) =
            Self::parse_opf(&opf_content)?;

        // 4. Resolve spine items to relative zip hrefs
        let mut spine_hrefs = Vec::new();
        for id in &spine_ids {
            if let Some(href) = manifest.get(id) {
                let full_href = if opf_dir.is_empty() {
                    href.clone()
                } else {
                    format!("{opf_dir}/{href}")
                };
                spine_hrefs.push(full_href);
            }
        }

        // 5. Try to extract cover image
        let (cover_image_bytes, cover_image_ext) =
            Self::extract_cover(&mut archive, &manifest, &opf_dir, cover_id_hint.as_deref());

        // 6. Build Table of Contents
        let table_of_contents = Self::build_toc(&mut archive, &manifest, &opf_dir, &spine_hrefs);
        let total_chapters = spine_hrefs.len();

        Ok(ParsedEpubMetadata {
            title,
            author,
            language,
            description,
            cover_image_bytes,
            cover_image_ext,
            spine_hrefs,
            table_of_contents,
            total_chapters,
        })
    }

    pub fn read_chapter(epub_bytes: &[u8], chapter_href: &str) -> Result<String, AppError> {
        let cursor = Cursor::new(epub_bytes);
        let mut archive = ZipArchive::new(cursor)
            .map_err(|e| AppError::Epub(format!("Failed to read EPUB archive: {e}")))?;

        // Clean href if it has query or fragment
        let clean_href = if let Some(idx) = chapter_href.find('#') {
            &chapter_href[..idx]
        } else {
            chapter_href
        };

        let raw_xhtml = Self::read_entry_string(&mut archive, clean_href)?;
        let inlined_html = Self::inline_chapter_images(&mut archive, clean_href, &raw_xhtml);
        Ok(inlined_html)
    }

    fn find_opf_path(archive: &mut ZipArchive<Cursor<&[u8]>>) -> Result<String, AppError> {
        let container_xml = Self::read_entry_string(archive, "META-INF/container.xml")
            .map_err(|_| AppError::Epub("Missing META-INF/container.xml in EPUB".to_string()))?;

        let mut reader = Reader::from_str(&container_xml);
        reader.config_mut().trim_text(true);

        let mut buf = Vec::new();
        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
                    if e.name().as_ref() == b"rootfile" {
                        for attr in e.attributes().flatten() {
                            if attr.key.as_ref() == b"full-path" {
                                let path = String::from_utf8_lossy(&attr.value).to_string();
                                return Ok(path);
                            }
                        }
                    }
                }
                Ok(Event::Eof) => break,
                Err(e) => return Err(AppError::Epub(format!("Error parsing container.xml: {e}"))),
                _ => {}
            }
            buf.clear();
        }

        Err(AppError::Epub(
            "Could not find rootfile in META-INF/container.xml".to_string(),
        ))
    }

    fn parse_opf(
        opf_content: &str,
    ) -> Result<
        (
            String,
            String,
            String,
            Option<String>,
            HashMap<String, String>,
            Vec<String>,
            Option<String>,
        ),
        AppError,
    > {
        let mut reader = Reader::from_str(opf_content);
        reader.config_mut().trim_text(true);

        let mut title = "Untitled Book".to_string();
        let mut author = "Unknown Author".to_string();
        let mut language = "en".to_string();
        let mut description = None;
        let mut manifest = HashMap::new();
        let mut spine_ids = Vec::new();
        let mut cover_id_hint = None;

        let mut current_tag = Vec::new();
        let mut buf = Vec::new();

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                    let qname = e.name();
                    let raw = qname.as_ref();
                    let local = if let Some(pos) = raw.iter().position(|&b| b == b':') {
                        &raw[pos + 1..]
                    } else {
                        raw
                    };

                    match local {
                        b"title" => current_tag = b"title".to_vec(),
                        b"creator" => current_tag = b"creator".to_vec(),
                        b"language" => current_tag = b"language".to_vec(),
                        b"description" => current_tag = b"description".to_vec(),
                        b"item" => {
                            let mut id = String::new();
                            let mut href = String::new();
                            let mut properties = String::new();

                            for attr in e.attributes().flatten() {
                                match attr.key.as_ref() {
                                    b"id" => id = String::from_utf8_lossy(&attr.value).to_string(),
                                    b"href" => href = String::from_utf8_lossy(&attr.value).to_string(),
                                    b"properties" => {
                                        properties = String::from_utf8_lossy(&attr.value).to_string()
                                    }
                                    _ => {}
                                }
                            }

                            if !id.is_empty() && !href.is_empty() {
                                if properties.contains("cover-image") {
                                    cover_id_hint = Some(id.clone());
                                }
                                manifest.insert(id, href);
                            }
                        }
                        b"itemref" => {
                            for attr in e.attributes().flatten() {
                                if attr.key.as_ref() == b"idref" {
                                    spine_ids.push(String::from_utf8_lossy(&attr.value).to_string());
                                }
                            }
                        }
                        b"meta" => {
                            let mut is_cover_meta = false;
                            let mut content_val = String::new();
                            for attr in e.attributes().flatten() {
                                if attr.key.as_ref() == b"name" && attr.value.as_ref() == b"cover" {
                                    is_cover_meta = true;
                                } else if attr.key.as_ref() == b"content" {
                                    content_val = String::from_utf8_lossy(&attr.value).to_string();
                                }
                            }
                            if is_cover_meta && !content_val.is_empty() {
                                cover_id_hint = Some(content_val);
                            }
                        }
                        _ => {}
                    }
                }
                Ok(Event::Text(e)) => {
                    let text = e.unescape().unwrap_or_default().to_string();
                    if !text.is_empty() {
                        if current_tag == b"title" && title == "Untitled Book" {
                            title = text;
                        } else if current_tag == b"creator" && author == "Unknown Author" {
                            author = text;
                        } else if current_tag == b"language" {
                            language = text;
                        } else if current_tag == b"description" {
                            description = Some(text);
                        }
                    }
                }
                Ok(Event::End(_)) => {
                    current_tag.clear();
                }
                Ok(Event::Eof) => break,
                Err(e) => return Err(AppError::Epub(format!("Error parsing OPF package: {e}"))),
                _ => {}
            }
            buf.clear();
        }

        Ok((
            title,
            author,
            language,
            description,
            manifest,
            spine_ids,
            cover_id_hint,
        ))
    }

    fn extract_cover(
        archive: &mut ZipArchive<Cursor<&[u8]>>,
        manifest: &HashMap<String, String>,
        opf_dir: &str,
        cover_id_hint: Option<&str>,
    ) -> (Option<Vec<u8>>, String) {
        // 1. Try explicit cover id hint from OPF
        if let Some(id) = cover_id_hint {
            if let Some(href) = manifest.get(id) {
                let path = if opf_dir.is_empty() {
                    href.clone()
                } else {
                    format!("{opf_dir}/{href}")
                };
                if let Ok(bytes) = Self::read_entry_bytes(archive, &path) {
                    let ext = if href.ends_with(".png") { "png" } else { "jpeg" };
                    return (Some(bytes), ext.to_string());
                }
            }
        }

        // 2. Search manifest for items with "cover" in id or href and image extension
        for (id, href) in manifest {
            let id_lower = id.to_lowercase();
            let href_lower = href.to_lowercase();
            if (id_lower.contains("cover") || href_lower.contains("cover"))
                && (href_lower.ends_with(".jpg")
                    || href_lower.ends_with(".jpeg")
                    || href_lower.ends_with(".png"))
            {
                let path = if opf_dir.is_empty() {
                    href.clone()
                } else {
                    format!("{opf_dir}/{href}")
                };
                if let Ok(bytes) = Self::read_entry_bytes(archive, &path) {
                    let ext = if href_lower.ends_with(".png") { "png" } else { "jpeg" };
                    return (Some(bytes), ext.to_string());
                }
            }
        }

        (None, "jpeg".to_string())
    }

    fn build_toc(
        archive: &mut ZipArchive<Cursor<&[u8]>>,
        manifest: &HashMap<String, String>,
        opf_dir: &str,
        spine_hrefs: &[String],
    ) -> Vec<TocItemDto> {
        // 1. Try to parse NCX Table of Contents (EPUB 2 standard)
        let mut ncx_entries: Vec<(String, String)> = Vec::new(); // (clean_href_target, title)
        let ncx_href = manifest
            .iter()
            .find(|(id, href)| {
                id.to_lowercase().contains("ncx") || href.to_lowercase().ends_with(".ncx")
            })
            .map(|(_, href)| {
                if opf_dir.is_empty() {
                    href.clone()
                } else {
                    format!("{opf_dir}/{href}")
                }
            });

        if let Some(ncx_path) = ncx_href {
            let ncx_dir = if let Some(idx) = ncx_path.rfind('/') {
                &ncx_path[..idx]
            } else {
                ""
            };
            if let Ok(ncx_content) = Self::read_entry_string(archive, &ncx_path) {
                let mut reader = Reader::from_str(&ncx_content);
                reader.config_mut().trim_text(true);
                let mut buf = Vec::new();
                let mut current_title = String::new();
                let mut in_text = false;

                loop {
                    match reader.read_event_into(&mut buf) {
                        Ok(Event::Start(e)) => {
                            let name = e.name();
                            let raw = name.as_ref();
                            let local = if let Some(pos) = raw.iter().position(|&b| b == b':') {
                                &raw[pos + 1..]
                            } else {
                                raw
                            };
                            if local == b"text" {
                                in_text = true;
                            }
                        }
                        Ok(Event::Empty(e)) => {
                            let name = e.name();
                            let raw = name.as_ref();
                            let local = if let Some(pos) = raw.iter().position(|&b| b == b':') {
                                &raw[pos + 1..]
                            } else {
                                raw
                            };
                            if local == b"content" {
                                for attr in e.attributes().flatten() {
                                    if attr.key.as_ref() == b"src" {
                                        let src = String::from_utf8_lossy(&attr.value).to_string();
                                        let resolved_src = Self::resolve_relative_path(ncx_dir, &src);
                                        let clean_src = resolved_src.split('#').next().unwrap_or(&resolved_src).to_string();
                                        if !current_title.is_empty() {
                                            ncx_entries.push((clean_src, current_title.clone()));
                                        }
                                    }
                                }
                            }
                        }
                        Ok(Event::Text(e)) => {
                            if in_text {
                                current_title = e.unescape().unwrap_or_default().to_string();
                            }
                        }
                        Ok(Event::End(e)) => {
                            let name = e.name();
                            let raw = name.as_ref();
                            let local = if let Some(pos) = raw.iter().position(|&b| b == b':') {
                                &raw[pos + 1..]
                            } else {
                                raw
                            };
                            if local == b"text" {
                                in_text = false;
                            }
                        }
                        Ok(Event::Eof) => break,
                        _ => {}
                    }
                    buf.clear();
                }
            }
        }

        // 2. Build final TOC mapping spine items to real titles
        let mut toc = Vec::new();
        for (index, href) in spine_hrefs.iter().enumerate() {
            let clean_spine_href = href.split('#').next().unwrap_or(href);

            // Check if matched in NCX
            let matched_title = ncx_entries.iter().find_map(|(ncx_src, title)| {
                let ncx_clean = ncx_src.split('#').next().unwrap_or(ncx_src);
                if ncx_clean == clean_spine_href
                    || clean_spine_href.ends_with(ncx_clean)
                    || ncx_clean.ends_with(clean_spine_href)
                {
                    Some(title.clone())
                } else {
                    None
                }
            });

            let title = if let Some(t) = matched_title {
                t
            } else {
                // Try reading chapter heading from HTML
                let heading = Self::extract_html_heading(archive, clean_spine_href);
                if let Some(h) = heading {
                    h
                } else if index == 0 {
                    "Title Page / Cover".to_string()
                } else {
                    let filename = href.rsplit('/').next().unwrap_or(href);
                    let display_name = filename
                        .trim_end_matches(".xhtml")
                        .trim_end_matches(".html")
                        .replace('_', " ")
                        .replace('-', " ");
                    if display_name.to_lowercase().contains("chapter")
                        || display_name.to_lowercase().contains("ch")
                    {
                        format!("Chapter {}", index + 1)
                    } else {
                        format!("Chapter {}", index + 1)
                    }
                }
            };

            toc.push(TocItemDto {
                index,
                title,
                href: href.clone(),
            });
        }

        toc
    }

    fn extract_html_heading(
        archive: &mut ZipArchive<Cursor<&[u8]>>,
        chapter_path: &str,
    ) -> Option<String> {
        if let Ok(content) = Self::read_entry_string(archive, chapter_path) {
            // Quick check for h1, h2, h3, or title
            for tag in &["h1", "h2", "h3", "title"] {
                let open_tag = format!("<{tag}");
                let close_tag = format!("</{tag}>");
                if let Some(start_pos) = content.find(&open_tag) {
                    if let Some(tag_end) = content[start_pos..].find('>') {
                        let inner_start = start_pos + tag_end + 1;
                        if let Some(close_pos) = content[inner_start..].find(&close_tag) {
                            let raw_text = &content[inner_start..inner_start + close_pos];
                            // Strip inner tags
                            let stripped = raw_text
                                .replace("<br/>", " ")
                                .replace("<br>", " ")
                                .replace("<br />", " ");
                            let mut clean = String::new();
                            let mut in_tag = false;
                            for c in stripped.chars() {
                                if c == '<' {
                                    in_tag = true;
                                } else if c == '>' {
                                    in_tag = false;
                                } else if !in_tag {
                                    clean.push(c);
                                }
                            }
                            let title = clean.trim().to_string();
                            if !title.is_empty() && title.len() < 80 {
                                return Some(title);
                            }
                        }
                    }
                }
            }
        }
        None
    }

    fn inline_chapter_images(
        archive: &mut ZipArchive<Cursor<&[u8]>>,
        chapter_path: &str,
        html: &str,
    ) -> String {
        let chapter_dir = if let Some(idx) = chapter_path.rfind('/') {
            &chapter_path[..idx]
        } else {
            ""
        };

        let mut result = html.to_string();
        let keys = [
            "src=\"",
            "src='",
            "xlink:href=\"",
            "xlink:href='",
            "href=\"",
            "href='",
        ];
        let mut replacements = Vec::new();

        for key in &keys {
            let mut search_from = 0;
            while let Some(start_pos) = result[search_from..].find(key) {
                let actual_start = search_from + start_pos + key.len();
                let quote = if key.ends_with('\'') { '\'' } else { '"' };

                if let Some(end_pos) = result[actual_start..].find(quote) {
                    let raw_url = &result[actual_start..actual_start + end_pos];
                    let url_lower = raw_url.to_lowercase();

                    if (url_lower.ends_with(".jpg")
                        || url_lower.ends_with(".jpeg")
                        || url_lower.ends_with(".png")
                        || url_lower.ends_with(".svg")
                        || url_lower.ends_with(".webp")
                        || url_lower.ends_with(".gif"))
                        && !url_lower.starts_with("data:")
                        && !url_lower.starts_with("http:")
                        && !url_lower.starts_with("https:")
                    {
                        let resolved = Self::resolve_relative_path(chapter_dir, raw_url);
                        if let Ok(bytes) = Self::read_entry_bytes(archive, &resolved) {
                            let mime = if url_lower.ends_with(".png") {
                                "image/png"
                            } else if url_lower.ends_with(".svg") {
                                "image/svg+xml"
                            } else if url_lower.ends_with(".webp") {
                                "image/webp"
                            } else if url_lower.ends_with(".gif") {
                                "image/gif"
                            } else {
                                "image/jpeg"
                            };

                            let b64 = general_purpose::STANDARD.encode(&bytes);
                            let data_uri = format!("data:{mime};base64,{b64}");
                            replacements.push((raw_url.to_string(), data_uri));
                        }
                    }
                    search_from = actual_start + end_pos + 1;
                } else {
                    break;
                }
            }
        }

        for (target, replacement) in replacements {
            result = result.replace(&target, &replacement);
        }

        result
    }

    fn resolve_relative_path(base_dir: &str, relative_path: &str) -> String {
        let clean_path = relative_path.split('?').next().unwrap_or(relative_path);
        let clean_path = clean_path.split('#').next().unwrap_or(clean_path);

        let mut parts: Vec<&str> = if base_dir.is_empty() {
            Vec::new()
        } else {
            base_dir.split('/').collect()
        };

        for segment in clean_path.split('/') {
            if segment == "." || segment.is_empty() {
                continue;
            } else if segment == ".." {
                parts.pop();
            } else {
                parts.push(segment);
            }
        }
        parts.join("/")
    }

    fn read_entry_string(
        archive: &mut ZipArchive<Cursor<&[u8]>>,
        name: &str,
    ) -> Result<String, AppError> {
        let bytes = Self::read_entry_bytes(archive, name)?;
        String::from_utf8(bytes).map_err(|e| {
            AppError::Epub(format!("Invalid UTF-8 in EPUB entry '{name}': {e}"))
        })
    }

    fn percent_decode(input: &str) -> String {
        let mut bytes = Vec::with_capacity(input.len());
        let mut chars = input.bytes();
        while let Some(b) = chars.next() {
            if b == b'%' {
                let h1 = chars.next();
                let h2 = chars.next();
                if let (Some(h1), Some(h2)) = (h1, h2) {
                    let hex_str = format!("{}{}", h1 as char, h2 as char);
                    if let Ok(val) = u8::from_str_radix(&hex_str, 16) {
                        bytes.push(val);
                        continue;
                    }
                }
            }
            bytes.push(b);
        }
        String::from_utf8_lossy(&bytes).to_string()
    }

    fn read_entry_bytes(
        archive: &mut ZipArchive<Cursor<&[u8]>>,
        name: &str,
    ) -> Result<Vec<u8>, AppError> {
        let decoded = Self::percent_decode(name);

        if let Ok(mut file) = archive.by_name(name) {
            let mut bytes = Vec::new();
            file.read_to_end(&mut bytes)
                .map_err(|e| AppError::Epub(format!("Failed to read '{name}': {e}")))?;
            return Ok(bytes);
        }

        if let Ok(mut file) = archive.by_name(&decoded) {
            let mut bytes = Vec::new();
            file.read_to_end(&mut bytes)
                .map_err(|e| AppError::Epub(format!("Failed to read '{decoded}': {e}")))?;
            return Ok(bytes);
        }

        // Fallback: match normalized name or endswith
        let target_norm = decoded.trim_start_matches('/');
        let count = archive.len();
        for i in 0..count {
            if let Ok(mut file) = archive.by_index(i) {
                let fname = file.name().to_string();
                let fname_norm = fname.trim_start_matches('/');
                if fname_norm == target_norm
                    || fname_norm.ends_with(target_norm)
                    || target_norm.ends_with(fname_norm)
                {
                    let mut bytes = Vec::new();
                    file.read_to_end(&mut bytes)
                        .map_err(|e| AppError::Epub(format!("Failed to read '{fname}': {e}")))?;
                    return Ok(bytes);
                }
            }
        }

        Err(AppError::Epub(format!(
            "Entry '{name}' (or '{decoded}') not found in EPUB"
        )))
    }
}
