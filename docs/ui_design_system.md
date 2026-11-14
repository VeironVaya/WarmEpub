# EPUB Reader - UI Design System

## 1. Visual Philosophy: Warm, Comforting, Editorial
Unlike Calibre's sterile desktop Qt interface or typical cold modern apps, our design system draws from warm editorial paper goods, modern indie reading apps, and comforting educational spaces (inspired by the Lago reference palette).

The design prioritizes:
- **Visual Warmth**: Soft cream/parchment surfaces that reduce eye fatigue during long reading sessions.
- **Calm Simplicity**: Generous whitespace, rounded card corners, and restrained color accents.
- **Neo-Grotesque Typographic Clarity**: Crisp, objective, legible letterforms for UI controls, paired with optional warm editorial serif for reading body text.

---

## 2. Color Palette & Design Tokens

Extracted directly from the warm reference palette:

```
┌─────────────────────────────────────────────────────────────┐
│                       WARM PALETTE                          │
├─────────────────┬──────────────────┬────────────────────────┤
│ Parchment Base  │ Terracotta Coral │ Muted Ocean Teal       │
│    #F5EFEB      │     #D3746B      │     #4B8B9B            │
├─────────────────┼──────────────────┼────────────────────────┤
│ Espresso Text   │ Warm Sand Border │ Soft Card Surface      │
│    #2D2825      │     #E5DDD3      │     #FAF7F2            │
└─────────────────┴──────────────────┴────────────────────────┘
```

### Color Token Reference Table

| Token Name | Hex Code | Semantic Role |
|---|---|---|
| `--color-bg-app` | `#F5EFEB` | Primary canvas/window background (Warm Oat / Parchment) |
| `--color-surface` | `#FAF7F2` | Card backgrounds, drawer panels, popover containers |
| `--color-surface-pure` | `#FFFFFF` | High-contrast inputs, highlighted cards, modal cards |
| `--color-primary` | `#D3746B` | Primary button, progress bars, active tab indicator (Terracotta Coral) |
| `--color-primary-hover`| `#C2655C` | Hover state for primary buttons |
| `--color-primary-light`| `#F9ECEB` | Subtle badges, active item background tint |
| `--color-secondary` | `#4B8B9B` | Tags, metadata badges, secondary action pills (Muted Teal) |
| `--color-secondary-light`| `#E7F2F4` | Badge background for secondary chips |
| `--color-text-main` | `#2D2825` | Headings, book titles, reader body text (Espresso Charcoal) |
| `--color-text-muted`| `#7C746E` | Author names, timestamps, page counts, shortcuts (Warm Taupe) |
| `--color-border` | `#E5DDD3` | Card outlines, divider lines, toolbar bottom border (Soft Sand) |

---

## 3. Typography: Neo-Grotesque Sans-Serif

As observed in Calibre's lineage, the UI uses **neo-grotesque sans-serif** typography. Neo-grotesque typefaces are characterized by their neutral, rationalized proportions, uniform stroke widths, and horizontal terminals, providing maximum legibility at small sizes without distracting visual quirks.

### 3.1 Font Stack Definition
```css
/* Core UI Neo-Grotesque Font Stack */
--font-neo-grotesque: "Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;

/* Reader Typography (User Toggleable) */
--font-reader-sans: var(--font-neo-grotesque);
--font-reader-serif: "Charter", "Merriweather", "Lora", "Georgia", serif;
```

### 3.2 Typographic Hierarchy

| Role | Font Family | Size | Weight | Line Height | Tracking |
|---|---|---|---|---|---|
| **App Title / Brand** | Neo-Grotesque | 22px (`1.375rem`) | 700 (Bold) | 1.2 | -0.02em |
| **Section Header (H2)**| Neo-Grotesque | 18px (`1.125rem`) | 600 (Semibold) | 1.3 | -0.01em |
| **Book Card Title** | Neo-Grotesque | 15px (`0.9375rem`)| 600 (Semibold) | 1.25 | -0.01em |
| **UI Body / Controls**| Neo-Grotesque | 14px (`0.875rem`) | 500 (Medium) | 1.4 | 0 |
| **Metadata / Captions**| Neo-Grotesque | 12px (`0.75rem`)  | 400 (Regular) | 1.3 | +0.01em |
| **Reader Text (Default)**| Reader Sans / Serif | 18px (`1.125rem`)| 400 (Regular) | 1.65 | 0 |

---

## 4. Component Design Specifications

### 4.1 Book Card Component
- **Corner Radius**: `16px` (`rounded-2xl`)
- **Background**: `--color-surface` (`#FAF7F2`) with `1px solid var(--color-border)`
- **Hover State**: Elevates by `-2px` with a gentle warm drop shadow (`box-shadow: 0 8px 24px rgba(74, 53, 40, 0.08)`)
- **Cover Art**: Fixed aspect ratio `2:3` with subtle inner radius (`10px`).
- **Progress Bar**:
  - Track: `4px` height, `--color-border`
  - Fill: `--color-primary` (`#D3746B`) rounded pill indicator

### 4.2 Reader Viewport
- **Distraction-Free Canvas**: Minimal padding around text column (max width: `720px` for optimal reading line length).
- **Auto-Hiding Top Bar**:
  - Floats on cursor movement or top tap.
  - Left: Back to Library button, Book Title.
  - Right: Table of Contents toggle, Reader Settings (font size, spacing, theme).
- **Bottom Scrubber**:
  - Displays: Chapter title, current page/percentage, remaining time estimate.

### 4.3 Floating 1-Click Translation & AI Word Card
The signature feature popup anchored above or below the selected word.

```
┌──────────────────────────────────────────────────────────┐
│  [🔊] ephemeral                                   [⭐]  │
│  /ɪˈfɛm.ər.əl/  •  adjective                             │
├──────────────────────────────────────────────────────────┤
│  🇮🇩 Terjemahan: Berlangsung singkat / fana               │
├──────────────────────────────────────────────────────────┤
│  💡 Konteks Kalimat (AI Explanation):                    │
│  Dalam kalimat ini, penulis menggunakan kata ini untuk   │
│  menggambarkan bunga yang hanya mekar selama beberapa    │
│  jam sebelum layu, menekankan keindahan yang cepat pergi.│
└──────────────────────────────────────────────────────────┘
```
- **Dimensions**: Max width `360px`, padding `16px`.
- **Card Background**: Clean warm surface (`#FAF7F2`) with `1px solid #E5DDD3` border.
- **Shadow**: `0 12px 32px rgba(45, 40, 37, 0.12)`.
- **Micro-Pills**:
  - Language indicator pill: Background `--color-secondary-light` (`#E7F2F4`), text `--color-secondary` (`#4B8B9B`).
  - Star button: Toggles warm gold (`#E5A93C`) when saved.

---

## 5. Shape, Elevation & Animation Tokens

- **Border Radius**:
  - Small pills/badges: `9999px` (`rounded-full`)
  - Buttons / Inputs: `12px` (`rounded-xl`)
  - Cards / Modals: `20px` (`rounded-2xl`)
- **Shadows**:
  - Card Resting: `0 2px 6px rgba(45, 40, 37, 0.04)`
  - Card Hover: `0 8px 20px rgba(45, 40, 37, 0.08)`
  - Floating Popover: `0 12px 32px rgba(45, 40, 37, 0.12)`
- **Transitions**: Smooth `150ms ease-out` for hover states and `200ms cubic-bezier(0.16, 1, 0.3, 1)` for popup entrance.

