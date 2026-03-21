// ── Per-category canvas configuration ───────────────────────────────────────
// Each product category has its own canvas size, available tools, AI prompt hints,
// starter backgrounds, and print settings. The editor reads this config on load
// to set up the correct environment for the product being edited.
//
// TO ADD A NEW CATEGORY:
//   1. Add an entry to CATEGORY_CONFIGS below
//   2. Add the category card to app/create/page.tsx
//   3. The editor will automatically pick up the config
//
// TO CUSTOMISE PER-CATEGORY TOOLS:
//   - availableTools controls which icons appear in the left tool strip
//   - starterBackgrounds controls the colour presets in the Backgrounds panel
//   - aiPromptHint is prepended to every AI layout prompt for this category

export type ToolId = 'select' | 'text' | 'shape' | 'sticker' | 'crop' | 'filter'
export type AspectRatio = 'Free' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '2:3' | '3:2' | '4:5'

export type CategoryConfig = {
  id: string
  label: string
  // Canvas logical dimensions (Konva stage size before responsive scaling)
  canvasW: number
  canvasH: number
  // Defaults
  defaultBackground: string
  defaultPageCount: number
  // Which tools appear in the left tool strip for this category
  availableTools: ToolId[]
  // Snap grid size in canvas px
  snapGrid: number
  // Crop aspect ratio presets shown in the properties panel
  aspectRatioPresets: AspectRatio[]
  // Prepended to Claude AI layout prompts — shape the style suggestion
  aiPromptHint: string
  // Export resolution hint (used when PDF/image export is implemented)
  printDPI: number
  orientation: 'landscape' | 'portrait' | 'square'
  // Background colour presets in the Backgrounds panel
  starterBackgrounds: string[]
  // Gradient presets specific to this category
  starterGradients: Array<{ from: string; to: string; angle: number; label: string }>
  // Placeholder text for new text elements in this category
  placeholderText: string
  // Short description shown in the editor topbar
  canvasLabel: string
}

export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {

  'photo-book': {
    id: 'photo-book',
    label: 'Photo Book',
    canvasLabel: 'Photo Book — A4 Landscape',
    canvasW: 800,
    canvasH: 600,
    defaultBackground: '#0f0f0f',
    defaultPageCount: 8,
    availableTools: ['select', 'text', 'shape', 'sticker', 'crop', 'filter'],
    snapGrid: 10,
    aspectRatioPresets: ['Free', '4:3', '3:2', '16:9'],
    aiPromptHint: 'This is a landscape photo book. Use horizontal multi-photo layouts. Vary between single hero, two-column, and three-photo grid pages.',
    printDPI: 300,
    orientation: 'landscape',
    starterBackgrounds: ['#0f0f0f', '#1a1410', '#2a1a08', '#0d1a2a', '#1a0d0d', '#ffffff', '#f5f0e8', '#fafafa'],
    starterGradients: [
      { from: '#1a1208', to: '#2a1a08', angle: 135, label: 'Warm dark' },
      { from: '#0d1a2a', to: '#1a2a3a', angle: 160, label: 'Deep ocean' },
      { from: '#1a0d0d', to: '#2a1a1a', angle: 120, label: 'Deep rose' },
      { from: '#f5f0e8', to: '#ebe4d8', angle: 45, label: 'Warm cream' },
    ],
    placeholderText: 'Add a caption…',
  },

  'photo-cards': {
    id: 'photo-cards',
    label: 'Photo Cards',
    canvasLabel: 'Photo Card — A6 Portrait',
    canvasW: 560,
    canvasH: 800,
    defaultBackground: '#ffffff',
    defaultPageCount: 2,
    availableTools: ['select', 'text', 'shape', 'sticker', 'crop'],
    snapGrid: 8,
    aspectRatioPresets: ['Free', '3:4', '2:3'],
    aiPromptHint: 'This is a portrait greeting card. Front: one large photo with elegant title text. Back: minimal design with message area and decorative accents.',
    printDPI: 300,
    orientation: 'portrait',
    starterBackgrounds: ['#ffffff', '#f5f0e8', '#fdf6f0', '#f0f0f8', '#fff8f0', '#0f0f0f', '#1a1a2a'],
    starterGradients: [
      { from: '#fff8f0', to: '#f5ece0', angle: 160, label: 'Soft peach' },
      { from: '#f0f0f8', to: '#e8e8f2', angle: 140, label: 'Soft lavender' },
      { from: '#0f0f0f', to: '#1a1a2a', angle: 180, label: 'Midnight' },
    ],
    placeholderText: 'Your message here…',
  },

  'wall-art': {
    id: 'wall-art',
    label: 'Wall Art',
    canvasLabel: 'Wall Art — A3 Portrait',
    canvasW: 560,
    canvasH: 800,
    defaultBackground: '#0f0f0f',
    defaultPageCount: 1,
    availableTools: ['select', 'text', 'shape', 'crop', 'filter'],
    snapGrid: 10,
    aspectRatioPresets: ['Free', '2:3', '3:4', '1:1', '9:16'],
    aiPromptHint: 'This is a dramatic wall art print. Use a single full-bleed photo with bold composition and minimal, high-contrast typography. Think gallery-quality.',
    printDPI: 300,
    orientation: 'portrait',
    starterBackgrounds: ['#0f0f0f', '#1a1a1a', '#0d0d14', '#ffffff', '#f5f0e8', '#1a1208'],
    starterGradients: [
      { from: '#0f0f0f', to: '#1a1a2a', angle: 180, label: 'Deep night' },
      { from: '#1a1208', to: '#0a0a0a', angle: 160, label: 'Warm black' },
      { from: '#f5f0e8', to: '#ffffff', angle: 90, label: 'Bright cream' },
    ],
    placeholderText: 'Add a title…',
  },

  'framed-photo': {
    id: 'framed-photo',
    label: 'Framed Photo',
    canvasLabel: 'Framed Photo — Square',
    canvasW: 700,
    canvasH: 700,
    defaultBackground: '#ffffff',
    defaultPageCount: 1,
    availableTools: ['select', 'text', 'crop', 'filter'],
    snapGrid: 10,
    aspectRatioPresets: ['Free', '1:1', '4:3', '3:4'],
    aiPromptHint: 'This is a single framed photo. Centre one large photo with a clean wide mat border (white or off-white). Add one short elegant caption below if text is present.',
    printDPI: 300,
    orientation: 'square',
    starterBackgrounds: ['#ffffff', '#f5f0e8', '#fafafa', '#f0f0f0', '#0f0f0f', '#1a1a1a'],
    starterGradients: [
      { from: '#ffffff', to: '#f0ece6', angle: 90, label: 'Pure white' },
      { from: '#f5f0e8', to: '#ebe4d8', angle: 90, label: 'Off-white' },
    ],
    placeholderText: 'Add a caption…',
  },

  'photo-strip': {
    id: 'photo-strip',
    label: 'Photo Strip',
    canvasLabel: 'Photo Strip — Photobooth',
    canvasW: 280,
    canvasH: 840,
    defaultBackground: '#0f0f0f',
    defaultPageCount: 1,
    availableTools: ['select', 'text', 'sticker', 'crop', 'filter'],
    snapGrid: 8,
    aspectRatioPresets: ['Free', '1:1', '3:4'],
    aiPromptHint: 'This is a photobooth strip (portrait, very tall). Stack exactly 4 equal-height photos vertically with 8px gaps. Small text at the bottom for a date or name.',
    printDPI: 300,
    orientation: 'portrait',
    starterBackgrounds: ['#0f0f0f', '#1a1a1a', '#ffffff', '#1a0d0d', '#0d1a0d'],
    starterGradients: [
      { from: '#0f0f0f', to: '#1a1a1a', angle: 180, label: 'Deep black' },
    ],
    placeholderText: 'Add text…',
  },

  'edited-photo': {
    id: 'edited-photo',
    label: 'Edited Photo',
    canvasLabel: 'Edited Photo — Square',
    canvasW: 800,
    canvasH: 800,
    defaultBackground: '#0f0f0f',
    defaultPageCount: 1,
    availableTools: ['select', 'text', 'shape', 'sticker', 'crop', 'filter'],
    snapGrid: 10,
    aspectRatioPresets: ['Free', '1:1', '4:3', '3:4', '16:9', '4:5'],
    aiPromptHint: 'This is a single edited photo canvas. Use one full-bleed photo. Add creative text overlays, colour grading suggestions, and mood-matching typography.',
    printDPI: 150,
    orientation: 'square',
    starterBackgrounds: ['#0f0f0f', '#1a1a1a', '#ffffff', '#f5f0e8'],
    starterGradients: [
      { from: '#0f0f0f', to: '#1a1a2a', angle: 180, label: 'Moody' },
      { from: '#1a1208', to: '#2a1a08', angle: 135, label: 'Warm' },
    ],
    placeholderText: 'Add overlay text…',
  },

  'instagram-post': {
    id: 'instagram-post',
    label: 'Instagram Post',
    canvasLabel: 'Instagram Post — 1:1',
    canvasW: 800,
    canvasH: 800,
    defaultBackground: '#0f0f0f',
    defaultPageCount: 1,
    availableTools: ['select', 'text', 'shape', 'sticker', 'crop', 'filter'],
    snapGrid: 10,
    aspectRatioPresets: ['Free', '1:1', '4:5', '9:16'],
    aiPromptHint: 'This is an Instagram square post. Bold, eye-catching layout. Strong typography. Think brand-forward editorial design optimised for social media feeds.',
    printDPI: 96,
    orientation: 'square',
    starterBackgrounds: ['#0f0f0f', '#1a1a1a', '#ffffff', '#f5f0e8', '#0d1a2a'],
    starterGradients: [
      { from: '#0f0f0f', to: '#1a1a2a', angle: 180, label: 'Night' },
      { from: '#1a0826', to: '#260d1a', angle: 135, label: 'Electric' },
      { from: '#f5f0e8', to: '#ebe4d8', angle: 45, label: 'Cream' },
    ],
    placeholderText: 'Your caption…',
  },

  'calendar': {
    id: 'calendar',
    label: 'Calendar',
    canvasLabel: 'Calendar — A4 Landscape',
    canvasW: 800,
    canvasH: 600,
    defaultBackground: '#ffffff',
    defaultPageCount: 12,
    availableTools: ['select', 'text', 'shape', 'crop', 'filter'],
    snapGrid: 10,
    aspectRatioPresets: ['Free', '4:3', '16:9'],
    aiPromptHint: 'This is one month of a wall calendar. Top 55% of page: large landscape photo. Bottom 45%: clean grid of days for the month, month name, and year. Minimal and elegant.',
    printDPI: 300,
    orientation: 'landscape',
    starterBackgrounds: ['#ffffff', '#f5f0e8', '#fafafa', '#0f0f0f', '#0d1a2a'],
    starterGradients: [
      { from: '#ffffff', to: '#f5f0e8', angle: 180, label: 'Clean white' },
      { from: '#0f0f0f', to: '#1a1a2a', angle: 180, label: 'Dark' },
    ],
    placeholderText: 'Month & Year',
  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: CategoryConfig = CATEGORY_CONFIGS['photo-book']

export function getCategoryConfig(categoryId?: string | null): CategoryConfig {
  if (!categoryId) return DEFAULT_CONFIG
  return CATEGORY_CONFIGS[categoryId] ?? DEFAULT_CONFIG
}

/** Best-effort detection from album title — used for albums created before
 *  the `category` column existed. */
export function detectCategoryFromTitle(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('photo book') || t.includes('album')) return 'photo-book'
  if (t.includes('card') || t.includes('postcard') || t.includes('greeting')) return 'photo-cards'
  if (t.includes('wall art') || t.includes('poster') || t.includes('print')) return 'wall-art'
  if (t.includes('framed') || t.includes('frame')) return 'framed-photo'
  if (t.includes('strip') || t.includes('booth')) return 'photo-strip'
  if (t.includes('edited') || t.includes('edit')) return 'edited-photo'
  if (t.includes('instagram') || t.includes('social')) return 'instagram-post'
  if (t.includes('calendar')) return 'calendar'
  return 'photo-book'
}
