# Folio — AI Photo Product Builder

AI-powered platform for turning photos into designed albums and print products.

Upload photos, describe a style, and Folio generates a complete layout. Edit everything in a canvas editor or export directly as a print-ready PDF.

**Live Demo:** https://photo-album-app-eta.vercel.app/


---

## What It Does

- Generate full photo albums using AI (Claude)
- Edit layouts with a drag-and-drop canvas editor
- Export print-ready PDFs at 2× resolution
- Support for 8 different product types
- Three ways to use: SaaS subscription, done-for-you service, or pay-per-export

**Core idea:** AI doesn't suggest templates — it designs entire layouts based on your style description.

---

## Key Features

- **AI album generation** — full layouts, backgrounds, typography, captions from a single prompt
- **AI restyling** — change colors, fonts, captions without moving your photos
- **Canvas editor** — drag, resize, rotate, inline text editing, layer management
- **20-step undo history**
- **8 product types** — photo books, cards, wall art, framed photos, photo strips, edited photos, Instagram posts, calendars
- **Photo & frame upload** — Cloudinary CDN with upload progress
- **PDF export** — A4 landscape/portrait, square, optional 3mm bleed
- **Dark/light theme**
- **Mobile-friendly simplified flow**
- **Row Level Security** — your data is private at the database level

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript |
| Canvas | Konva.js + react-konva |
| State | Zustand (with undo history) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Media | Cloudinary |
| AI | Anthropic Claude (Haiku for generation, Haiku for restyle) |
| Export | jsPDF + html2canvas |
| Styling | Tailwind CSS + CSS Variables |
| Deployment | Vercel |

---

## Project Structure

```
folio/
├── app/
│   ├── page.tsx              # Landing page
│   ├── home/page.tsx         # Post-login welcome
│   ├── dashboard/page.tsx    # Album management
│   ├── create/page.tsx       # Product type selector
│   ├── about/page.tsx        # About page
│   ├── album/[id]/edit/      # Main canvas editor
│   └── api/
│       ├── ai-layout/        # AI generation + restyle endpoint
│       └── refine-layout/    # Element-level AI refinement
├── components/
│   └── AlbumCanvas.tsx       # Konva canvas editor
├── lib/
│   ├── store.ts              # Zustand state management
│   ├── supabase.ts           # Supabase client + types
│   ├── cloudinary.ts         # Upload helpers
│   ├── categoryConfig.ts     # Per-product canvas config
│   └── theme.tsx             # Dark/light theme context
├── supabase/
│   └── schema.sql            # Database schema + RLS policies
└── docs/
    └── demo-plan.md          # Presentation plan
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Cloudinary account
- An Anthropic API key

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/folio.git
cd folio
npm install --legacy-peer-deps
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` with the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Database Setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor. This creates all tables and RLS policies.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## AI Architecture

Folio uses a 3-tier AI model routing system:

| Tier | Model | Use Case | Cost |
|------|-------|----------|------|
| 1 | Claude Haiku | Captions, color suggestions, font pairing | Free / minimal |
| 2 | Claude Haiku | Per-page restyle, batch captions | Session quota |
| 3 | Claude Haiku | Full album generation from scratch | Monthly quota |

**Rate limiting:** 30 AI requests per 5 minutes per user (in-memory, Upstash Redis planned for production).

### How AI Layout Works

1. User uploads photos and writes a style prompt
2. API route authenticates the request (Supabase JWT verification)
3. Claude receives: canvas dimensions, photo IDs, design rules, category config, and user prompt
4. Claude returns structured JSON: `{ pages: [{ background, elements: [...] }] }`
5. Response is validated, photo placeholder URLs replaced with real Cloudinary URLs
6. Pages committed to Zustand state → canvas re-renders

---

## Canvas Editor

Built on **Konva.js** with a responsive scaling system:

- Logical canvas size (e.g. 800×600) scales down to fit any viewport via `ResizeObserver`
- All coordinates stored at full resolution — AI-generated coordinates match exactly what renders
- Elements: `image`, `text`, `frame` types
- Inline text editing via positioned `<textarea>` overlay
- Context menu (right-click) for layer ordering and deletion
- Transformer handles for resize and rotation

---

## Security

- All tables use **Row Level Security** — `auth.uid() = user_id` enforced at database level
- AI API routes verify Bearer token via `supabase.auth.getUser()` on every request
- Cloudinary uploads use unsigned presets scoped to a specific folder
- No secrets exposed client-side

---

## Deployment

Deployed on **Vercel** with the following config:

```json
{
  "installCommand": "npm install --legacy-peer-deps"
}
```

All environment variables must be set in Vercel project settings.

---

## Roadmap

- [ ] Stripe integration (pay-per-export + subscriptions)
- [ ] Video support in album pages
- [ ] QR code generation linking print → digital gallery
- [ ] Physical print ordering (Printful/Gelato)
- [ ] Persistent rate limiting (Upstash Redis)
- [ ] Bilingual support (EN/SQ)
- [ ] Snap guides and full crop tool
- [ ] Server-side PDF rendering (Puppeteer) for guaranteed quality

---

## Status

Active project. Production-focused, built in Pristina, Kosovo.

> *Proof that world-class software can come from anywhere.*
