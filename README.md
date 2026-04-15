# Folio - AI Photo Product Builder

AI-powered platform for turning photos into designed albums and print products.

## What It Does

- Generates full photo albums using AI
- Supports drag-and-drop canvas editing
- Exports print-ready PDFs
- Supports multiple product types (albums, cards, wall art, and more)

## Live Deployment

Live app: `https://photo-album-app-eta.vercel.app`

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

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase project settings)
- `ANTHROPIC_API_KEY` (required for AI generate/refine)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` (uploads)
- `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` (server-side Cloudinary cleanup/signing)

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
```

## Architecture Notes

- Editor state is managed in Zustand.
- Data is persisted to Supabase.
- AI generation runs in API routes and returns structured JSON.
- Canvas rendering is resolution-independent and scales responsively.

## User Feedback (In-App)

The app is designed to be "self-explanatory" while you work. Here's where to look for feedback:

- **Auth**: inline success/error messages on the login/signup screen (e.g. "check your email" after sign up).
- **Editor save state**: the primary action button reflects state (`Save` -> `Saving...` -> `Saved`).
- **Load failures**: a dedicated error screen with Retry/Back when an album can't be loaded.
- **Exports**: export failures show a blocking alert with a concrete next step (usually "wait for photos to load and try again").

## Feedback & Support

If something is confusing or broken, please open a GitHub issue (or start a discussion) and include:

- Steps to reproduce + expected vs actual behavior
- Screenshot/screen recording (especially for editor/export issues)
- Browser + OS
- Any relevant console/network errors from DevTools
