# Folio — AI Photo Product Builder

AI-powered platform for turning photos into designed albums and print products.

Upload photos, describe a style, and Folio generates a complete layout. You can edit everything in a canvas editor or export directly.

---

## What It Does

- Generate full photo albums using AI
- Edit layouts with a drag-and-drop canvas
- Export print-ready PDFs
- (Soon) order physical products

**Core idea:** AI doesn’t suggest templates — it designs entire layouts.

---

## Key Features

- AI album generation (full layouts, restyling, captions)
- Canvas editor (drag, resize, text editing, layers)
- Photo upload & management (Cloudinary)
- Built-in templates (wedding, travel, minimal, etc.)
- PDF export (A4, square, high-res)
- Multiple product types (albums, cards, wall art, etc.)

---

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind
- **Canvas:** Konva.js
- **State:** Zustand
- **Backend/DB:** Supabase (PostgreSQL + Auth)
- **Storage/CDN:** Cloudinary
- **AI:** Anthropic Claude
- **Export:** jsPDF + html2canvas
- **Deployment:** Vercel

---

## Project Structure
- app/ # Pages & API routes
- components/ # UI components
- lib/ # Core logic (store, config, services)
- supabase/ # Database schema

---

## Getting Started

```bash
git clone https://github.com/YOUR_USERNAME/folio.git
cd folio
npm install --legacy-peer-deps
cp .env.example .env.local
npm run dev

## Core Architecture

Editor state lives in Zustand (fast, in-memory)
Data persists to Supabase (manual saves)
AI runs via API routes with structured JSON output
Canvas is resolution-independent (scaled rendering)

##Status

Active solo project. Production-focused but still evolving.
