# Folio — Demo Plan
**Prezantimi Final | 5–7 minuta**

---

## 1. Çka është projekti dhe kujt i shërben

**Folio** është një platformë AI-powered për krijimin e produkteve fotografike — photo books, wall art, greeting cards, calendars dhe më shumë.

**Kujt i shërben:**
- Njerëzve që kanë foto të grumbulluara në telefon/cloud dhe duan t'i kthejnë në diçka të bukur dhe të qëndrueshme
- Çifteve, familjeve, udhëtarëve, fotografëve amatorë
- Bizneseve të vogla që duan materiale vizuale të personalizuara

**Problemi që zgjidh:**  
Shumica e njerëzve nuk janë dizajnerë. Folio lejon këdo — pa eksperiencë dizajni — të krijojë produkte fotografike me cilësi profesionale, duke përdorur AI si bashkëpunëtor kreativ.

**3 mënyra përdorimi:**
1. **SaaS (subscription)** — vete-shërbim me kuotë mujore AI
2. **Done-for-you** — shërbim i menaxhuar nga ekipi
3. **Pay-per-export** — krijo falas, paguaj vetëm kur eksporton

---

## 2. Flow kryesor i demonstrimit

> **Kohëzgjatja totale: ~6 minuta**

### Hapi 1 — Autentifikimi (30 sek)
- Hap `folio.vercel.app` (ose URL live)
- Trego faqen kryesore: dizajni, tagline, features
- Kliko **"Get started"** → regjistrohu ose hyr me llogari ekzistuese
- Shko automatikisht te `/home`

### Hapi 2 — Krijo produkt të ri (45 sek)
- Kliko **"Start a new project"**
- Shfaq faqen `/create` me 8 llojet e produkteve
- Zgjidh **Photo Book** (produkti më popullor)
- Sistema krijon album të ri dhe kalon te editor

### Hapi 3 — Ngarko foto (45 sek)
- Në panelin e djathtë, trego **dropzone**
- Ngarko 3–5 foto (kë i keni gati paraprakisht)
- Trego si foto shfaqen në panel dhe mund të drag & drop-ohen

### Hapi 4 — AI Layout Generation ⭐ (90 sek — pjesa kryesore)
- Kliko **"✨ AI Layout"** në topbar
- Shfaqet modal me prompt examples
- Shkruaj: *"Dark moody wedding — black backgrounds, amber candlelight, Playfair fonts"*
- Kliko **"Generate Album"**
- **Prit 3–5 sekonda** — Claude gjeneron layout të plotë
- Trego rezultatin: faqe të shumta, foto të pozicionuara, tekst, ngjyra
- Shpjego shkurt: *"Claude mori fotografitë, koordinatat e canvas-it dhe stilin — dhe ndërtoi JSON të strukturuar që u kthye në faqe reale"*

### Hapi 5 — Canvas Editor (60 sek)
- Kliko mbi një foto — trego **transformer handles** (resize, rotate)
- Kliko mbi tekst — trego **inline editing** (double-click)
- Shpjego panelin e djathtë: opacity, font, color
- Trego **undo** me ⌘Z
- Ndrysho background nga paneli **Bg**

### Hapi 6 — AI Restyle (30 sek)
- Kliko **"✨ AI Restyle"**
- Shkruaj: *"Minimal Japanese — white space, clean sans-serif"*
- Trego si ndryshon stili PA lëvizur fotot

### Hapi 7 — Eksporto PDF (30 sek)
- Kliko **"Export"**
- Zgjidh **A4 Landscape**, aktivizo **3mm bleed**
- Kliko **"Download PDF"**
- Trego se PDF-i u shkarkua

### Hapi 8 — Mbyllje (30 sek)
- Shfaq **Dashboard** me albumet e ruajtura
- Përmend roadmap: video in albums, QR codes, print ordering
- *"Folio është i ndërtuar në Kosovë — proof se software i klasit botëror mund të vijë nga kudo"*

---

## 3. Pjesët teknike që do t'i shpjegosh shkurt

### Arkitektura AI (3-tier)
```
Tier 1: Claude Haiku  → sugjerime të vogla, captions, falas
Tier 2: Claude Haiku  → restyle, batch captions, kuotë sesioni  
Tier 3: Claude Haiku  → generim i plotë album, kuotë mujore
```
Shpjego: *"Routing sipas kompleksitetit — jo gjithmonë modeli më i shtrenjtë"*

### Canvas Engine
- **Konva.js** renderim mbi HTML canvas — 60fps, pixel-perfect
- **Zustand** state management me 20-hap undo history
- Koordinatat ruhen në madhësi të plotë (800×600), skalojnë responsivisht

### AI → JSON → Pages Pipeline
```
Prompt → API route → Claude → JSON response → validation → 
replace photo IDs with URLs → commit to Zustand state
```

### Siguria
- **Row Level Security** në të gjitha tabelat Supabase
- Token verification server-side para çdo AI call
- Rate limiting: 30 AI requests / 5 min / user

---

## 4. Çfarë duhet kontrolluar para demos

### ✅ Checklist Teknik
- [ ] URL live është aktive dhe hapet normalisht
- [ ] Login/signup funksionon
- [ ] Cloudinary upload preset është aktiv
- [ ] `ANTHROPIC_API_KEY` është i vlefshëm dhe ka kredit
- [ ] `NEXT_PUBLIC_SUPABASE_URL` dhe `ANON_KEY` janë të sakta
- [ ] PDF export funksionon (test me 2 faqe)
- [ ] AI Layout gjeneron rezultat brenda 10 sekondave
- [ ] Drag & drop foto funksionon

### ✅ Checklist Demo
- [ ] Keni 4–6 foto gati për upload (JPEG, nën 5MB secila)
- [ ] Keni testuar flow-n plotësisht të paktën 1 herë
- [ ] Browser cache është pastruar
- [ ] Tab-et e tjera të browser-it janë mbyllur
- [ ] Interneti është i qëndrueshëm (prefero Wi-Fi)
- [ ] Screen sharing funksionon
- [ ] Zmadhimi i browser-it është 100%

### ✅ Checklist Prezantimi
- [ ] `docs/demo-plan.md` është i plotë
- [ ] README është i përditësuar
- [ ] Git push i fundit është bërë
- [ ] Dini ta shpjegoni projektin në 30 sekonda (elevator pitch)

---

## 5. Plani B — nëse live demo dështon

### Skenari 1: Internet nuk funksionon
**Veprim:** Hapni `localhost:3000` (development server lokal)
```bash
npm run dev
```
Demo vazhdon identikisht — i gjithë kodi ekzekutohet lokalisht.

### Skenari 2: AI API nuk përgjigjet / timeout
**Veprim:** Keni një **album të pre-gjeneruar** të ruajtur:
- Hyni në dashboard → hapni albumin ekzistues
- Tregoni rezultatin final duke thënë: *"Ky është output-i tipik i AI-t"*
- Vazhdoni me canvas editing dhe export

### Skenari 3: Upload Cloudinary dështon
**Veprim:** Keni foto tashmë të ngarkuara në albumin demo
- Anashkaloni hapin e upload-it
- Filloni direkt nga canvas editor me fotot ekzistuese

### Skenari 4: PDF export dështon
**Veprim:** Tregoni modal-in e export-it dhe shpjegoni procesin teknik
- *"html2canvas renderizes canvas-in në 2× rezolucion, jsPDF assembles faqet"*
- Tregoni screen capture të një PDF-i të bërë paraprakisht

### Skenari 5: Vercel deployment është down
**Veprim:** 
1. Hapni development server lokal (hapi 1 lart)
2. Ose tregoni screenshots/video recording të aplikacionit në punë

---

## Elevator Pitch (30 sekonda)

> *"Folio është një platformë AI-powered për krijimin e photo books, wall art dhe kartolina. Ngarkoni fotot, përshkruani stilin — dhe Claude dizajnon gjithçka: faqet, fontet, ngjyrat, captiont. Mund ta editoni manualisht ose ta eksportoni direkt si PDF print-ready. Është ndërtuar në Kosovë me Next.js, Konva.js dhe Claude API."*

---

## Informacion i Shpejtë

| Detaj | Vlera |
|-------|-------|
| Live URL | `https://[your-url].vercel.app` |
| Stack | Next.js 14, Supabase, Konva.js, Claude API |
| AI Model | Claude Haiku (layout generation) |
| Canvas size | 800×600px (photo book default) |
| Export formats | A4 Landscape, A4 Portrait, Square |
| Produkte | 8 lloje (photo book, cards, wall art, etj.) |

---

*Folio — ndërtuar në Prishtinë, dizajnuar për botën.*
