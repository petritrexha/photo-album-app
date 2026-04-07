# Folio - AI Photo Product Builder

AI-powered platform for turning photos into designed albums and print products.

## What It Does

- Generates full photo albums using AI
- Supports drag-and-drop canvas editing
- Exports print-ready PDFs
- Supports multiple product types (albums, cards, wall art, and more)

## Tech Stack

- Frontend: Next.js 14, TypeScript, Tailwind
- Canvas: Konva.js
- State: Zustand
- Backend/DB: Supabase (PostgreSQL + Auth + RLS)
- Storage/CDN: Cloudinary
- AI: Anthropic Claude
- Export: jsPDF + html2canvas
- Deployment: Vercel

## Project Structure

- `app/` - Pages and API routes
- `components/` - UI components
- `lib/` - Core logic (store, config, services)
- `supabase/` - Database schema and migrations

## Getting Started

```bash
git clone https://github.com/petritrexha/photo-album-app.git
cd photo-album-app
npm install
npm run dev
```

## Architecture Notes

- Editor state is managed in Zustand.
- Data is persisted to Supabase.
- AI generation runs in API routes and returns structured JSON.
- Canvas rendering is resolution-independent and scales responsively.

