// ── Folio i18n — English & Albanian ─────────────────────────────────────────
// Albanian (sq) strings marked // TODO: review sq should be reviewed by a native speaker

export type Lang = 'en' | 'sq'

export const STRINGS: Record<string, Record<Lang, string>> = {
  // ── Navigation ──────────────────────────────────────────────────
  'nav.features':       { en: 'Features',        sq: 'Veçoritë' },
  'nav.how_it_works':   { en: 'How it works',     sq: 'Si funksionon' },
  'nav.about':          { en: 'About',            sq: 'Rreth nesh' },
  'nav.pricing':        { en: 'Pricing',          sq: 'Çmimet' },
  'nav.sign_in':        { en: 'Sign in',          sq: 'Hyr' },
  'nav.get_started':    { en: 'Get started',      sq: 'Fillo tani' },
  'nav.open_app':       { en: 'Open app',         sq: 'Hap aplikacionin' },
  'nav.home':           { en: 'Home',             sq: 'Kryefaqja' },

  // ── Auth ─────────────────────────────────────────────────────────
  'auth.welcome_back':          { en: 'Welcome back',              sq: 'Mirë se u ktheve' },
  'auth.create_account':        { en: 'Create account',            sq: 'Krijo llogari' },
  'auth.sign_in_desc':          { en: 'Sign in to your Folio account',  sq: 'Hyr në llogarinë tënde Folio' },
  'auth.sign_up_desc':          { en: 'Start building beautiful albums', sq: 'Fillo të ndërtosh albume të bukura' },
  'auth.email':                 { en: 'Email',                     sq: 'Email' },
  'auth.password':              { en: 'Password',                  sq: 'Fjalëkalimi' },
  'auth.sign_in':               { en: 'Sign in',                   sq: 'Hyr' },
  'auth.sign_up':               { en: 'Sign up',                   sq: 'Regjistrohu' },
  'auth.no_account':            { en: "Don't have an account?",    sq: 'Nuk keni llogari?' },
  'auth.have_account':          { en: 'Already have one?',         sq: 'Keni tashmë llogari?' },
  'auth.creating':              { en: 'Creating…',                 sq: 'Po krijohet…' },
  'auth.signing_in':            { en: 'Signing in…',               sq: 'Po hyhet…' },
  'auth.wait':                  { en: 'Wait',                      sq: 'Prisni' },
  'auth.seconds':               { en: 's…',                        sq: 's…' },
  'auth.check_email':           { en: 'Account created! Check your email to confirm your account, then sign in.', sq: 'Llogaria u krijua! Kontrolloni emailin tuaj për të konfirmuar llogarinë, pastaj hyni.' }, // TODO: review sq
  'auth.too_many':              { en: 'Too many attempts — please wait 60 seconds and try again.',  sq: 'Shumë tentativa — ju lutem prisni 60 sekonda dhe provoni sërish.' }, // TODO: review sq
  'auth.confirm_email':         { en: 'Please check your inbox and confirm your email before signing in.', sq: 'Kontrolloni kutinë hyrëse dhe konfirmoni emailin para se të hyni.' }, // TODO: review sq
  'auth.invalid_login':         { en: 'Incorrect email or password. Please try again.', sq: 'Email ose fjalëkalim i gabuar. Ju lutem provoni sërish.' }, // TODO: review sq
  'auth.already_exists':        { en: 'An account with this email already exists. Try signing in instead.', sq: 'Tashmë ekziston një llogari me këtë email. Provoni të hyni.' }, // TODO: review sq
  'auth.password_short':        { en: 'Password must be at least 6 characters long.', sq: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' }, // TODO: review sq
  'auth.generic_error':         { en: 'Something went wrong. Please try again.', sq: 'Diçka shkoi keq. Ju lutem provoni sërish.' }, // TODO: review sq
  'auth.retry_in':              { en: 'Retry in',                  sq: 'Riprovoni pas' },

  // ── Landing Hero ─────────────────────────────────────────────────
  'hero.badge':         { en: 'AI-powered album design',   sq: 'Dizajn albumesh me AI' },
  'hero.headline_1':    { en: 'Your memories,',            sq: 'Kujtimet tuaja,' },
  'hero.headline_2':    { en: 'beautifully arranged.',     sq: 'të rregulluara bukur.' },
  'hero.subtitle':      { en: 'Upload photos. Let AI design your album with the exact style and mood you describe. Export as a print-ready PDF or order physical copies.', sq: 'Ngarkoni foto. Lëreni AI-n të dizajnojë albumin tuaj me stilin dhe humorin që dëshironi. Eksportoni si PDF ose porosisni kopje fizike.' }, // TODO: review sq
  'hero.cta_primary':   { en: 'Create your first album',  sq: 'Krijo albumin tënd të parë' },
  'hero.cta_secondary': { en: 'Sign in',                   sq: 'Hyr' },
  'hero.scroll':        { en: 'Scroll',                    sq: 'Lëviz' },

  // ── Features ─────────────────────────────────────────────────────
  'features.badge':     { en: 'What you get',             sq: 'Çfarë merrni' },
  'features.headline':  { en: 'Everything you need to create a beautiful album', sq: 'Gjithçka për të krijuar një album të bukur' }, // TODO: review sq
  'features.ai_gen':         { en: 'Full AI Generation',   sq: 'Gjenerim i plotë me AI' },
  'features.ai_gen_desc':    { en: 'Describe your style in plain language. Claude designs every page — layouts, fonts, backgrounds, captions — in seconds.', sq: 'Përshkruani stilin tuaj me gjuhë të thjeshtë. Claude dizajnon çdo faqe — modele, fontet, sfondet, titrat — në sekonda.' }, // TODO: review sq
  'features.templates':      { en: 'Template Library',    sq: 'Biblioteka e modeleve' },
  'features.templates_desc': { en: 'Wedding, travel, baby, birthday, minimal. Start from a professionally designed template and make it yours.', sq: 'Martesë, udhëtim, fëmijë, ditëlindje, minimal. Filloni nga një model professional dhe bëjeni tëndin.' }, // TODO: review sq
  'features.canvas':         { en: 'Canvas Editor',       sq: 'Redaktues tabelë' },
  'features.canvas_desc':    { en: 'Drag, drop, resize, rotate. Layer photos with text overlays, custom frames, and decorative elements.', sq: 'Tërhiq, lësho, rindëso, rrotullo. Shtresoni foto me tekst, korniza dhe elemente dekorative.' }, // TODO: review sq
  'features.refine':         { en: 'AI Refinement',       sq: 'Rafinim me AI' },
  'features.refine_desc':    { en: "Tell Claude to restyle your album — change colours, rewrite captions, update fonts — without touching your photo layout.", sq: 'Thuajini Claude-it të ristilizojë albumin tuaj — ndryshoni ngjyrat, rishkruani titrat, përditësoni fontet — pa prekur modelin e fotove.' }, // TODO: review sq
  'features.pdf':            { en: 'Print-Ready PDF',     sq: 'PDF gati për printim' },
  'features.pdf_desc':       { en: 'Export at 2× resolution with optional bleed margins. A4 landscape, portrait, or square formats.', sq: 'Eksportoni në rezolucion 2× me marzhe opsionale. Formatet A4 horizontale, vertikale ose katrorë.' }, // TODO: review sq
  'features.frames':         { en: 'Custom Frames',       sq: 'Korniza të personalizuara' },
  'features.frames_desc':    { en: 'Upload your own PNG overlays — borders, decorative stickers, watermarks — and layer them on any photo.', sq: 'Ngarkoni mbulime PNG — kufij, ngjitëse dekorative, marka ujore — dhe shtresojini mbi çdo foto.' }, // TODO: review sq

  // ── How it works ─────────────────────────────────────────────────
  'how.badge':          { en: 'Three ways to create',    sq: 'Tre mënyra për të krijuar' },
  'how.headline':       { en: 'Your workflow, your choice', sq: 'Rrjedha juaj, zgjedhja juaj' },
  'how.mode1_tag':      { en: 'Hands-free',              sq: 'Automatik' },
  'how.mode1_title':    { en: 'Let AI do everything',    sq: 'Lejo AI-n të bëjë gjithçka' },
  'how.mode1_desc':     { en: 'Upload photos, describe the mood. Claude designs every page — layouts, typography, colour palette, captions.', sq: 'Ngarkoni foto, përshkruani humorin. Claude dizajnon çdo faqe.' }, // TODO: review sq
  'how.mode2_tag':      { en: 'Hybrid',                  sq: 'Hibrid' },
  'how.mode2_title':    { en: 'Start smart, finish your way', sq: 'Fillo mençur, përfundo si dëshiron' },
  'how.mode2_desc':     { en: 'AI generates a complete first draft. You refine, rearrange, add your personal touch, and refine again.', sq: 'AI gjeneron një draft të plotë. Ju rafinoni, rirregulloni dhe shtoni prekjen tuaj personale.' }, // TODO: review sq
  'how.mode3_tag':      { en: 'Full control',            sq: 'Kontroll i plotë' },
  'how.mode3_title':    { en: 'Build every detail yourself', sq: 'Ndërtoni çdo detaj vetë' },
  'how.mode3_desc':     { en: 'A professional canvas editor. Drag-and-drop photos, add text, layer frames, control every pixel.', sq: 'Redaktues profesional. Tërhiqni dhe lëshoni foto, shtoni tekst, shtresoni korniza.' }, // TODO: review sq

  // ── CTA section ──────────────────────────────────────────────────
  'cta.headline_1':     { en: 'Ready to preserve your',  sq: 'Gati të ruani' },
  'cta.headline_2':     { en: 'best moments?',           sq: 'momentet tuaja më të mira?' },
  'cta.subtitle':       { en: 'Free to start. AI-designed albums in minutes.', sq: 'Falas për të filluar. Albume të dizajnuara me AI në minuta.' }, // TODO: review sq

  // ── Dashboard ────────────────────────────────────────────────────
  'dashboard.title':        { en: 'Your Albums',          sq: 'Albumet Tuaja' },
  'dashboard.album_count':  { en: 'album',                sq: 'album' },
  'dashboard.albums_count': { en: 'albums',               sq: 'albume' },
  'dashboard.matching':     { en: 'matching',             sq: 'duke përputhur' },
  'dashboard.new_album':    { en: 'New Album',            sq: 'Album i Ri' },
  'dashboard.search':       { en: 'Search albums…',       sq: 'Kërko albume…' },
  'dashboard.no_albums':    { en: 'No albums yet',        sq: 'Nuk ka albume ende' },
  'dashboard.no_albums_desc': { en: 'Create your first album and let AI design it for you.', sq: 'Krijoni albumin tuaj të parë dhe lëreni AI-n ta dizajnojë.' }, // TODO: review sq
  'dashboard.create':       { en: 'Create album',         sq: 'Krijo album' },
  'dashboard.pages':        { en: 'pages',                sq: 'faqe' },
  'dashboard.page':         { en: 'page',                 sq: 'faqe' },
  'dashboard.sign_out':     { en: 'Sign out',             sq: 'Dil' },
  'dashboard.ai_tip':       { en: 'Open any album and click ✨ AI Layout to have Claude design a complete layout from your photos.', sq: 'Hapni çdo album dhe klikoni ✨ Modeli AI që Claude të dizajnojë një model të plotë nga fotot tuaja.' }, // TODO: review sq
  'dashboard.ai_tip_strong':{ en: 'Tip:',                 sq: 'Këshillë:' },
  'dashboard.edit':         { en: 'Edit',                 sq: 'Redakto' },
  'dashboard.delete':       { en: 'Delete',               sq: 'Fshi' },
  'dashboard.delete_confirm': { en: 'Delete album?',      sq: 'Fshi albumin?' },
  'dashboard.delete_desc':  { en: 'will be permanently deleted. This action cannot be undone.', sq: 'do të fshihet përgjithmonë. Ky veprim nuk mund të zhbëhet.' }, // TODO: review sq
  'dashboard.cancel':       { en: 'Cancel',               sq: 'Anulo' },
  'dashboard.open_editor':  { en: 'Open editor',          sq: 'Hap redaktuesin' },
  'dashboard.no_cover':     { en: 'No cover photo',       sq: 'Nuk ka foto kopertinë' },

  // ── Create page ──────────────────────────────────────────────────
  'create.badge':       { en: 'Choose your product',     sq: 'Zgjidhni produktin tuaj' },
  'create.headline_1':  { en: 'What would you like to',  sq: 'Çfarë dëshironi të' },
  'create.headline_2':  { en: 'create?',                 sq: 'krijoni?' },
  'create.subtitle':    { en: "Pick a product type and we'll set up the perfect canvas. Use AI to generate a full layout, or build it yourself.", sq: 'Zgjidhni një lloj produkti dhe do të vendosim tabelën perfekte. Përdorni AI për të gjeneruar një model të plotë, ose ndërtojeni vetë.' }, // TODO: review sq
  'create.start':       { en: 'Start creating',          sq: 'Fillo të krijoni' },
  'create.creating':    { en: 'Creating…',               sq: 'Po krijohet…' },
  'create.tip':         { en: 'Not sure where to start?',sq: 'Nuk jeni i sigurt ku të filloni?' },
  'create.tip_link':    { en: 'Try a Photo Book',        sq: 'Provoni një Album Fotosh' },
  'create.tip_suffix':  { en: '— our most popular format.', sq: '— formati ynë më i popullarizuar.' },

  // ── Editor ───────────────────────────────────────────────────────
  'editor.save':        { en: 'Save',              sq: 'Ruaj' },
  'editor.saved':       { en: 'Saved',             sq: 'Ruajtur' },
  'editor.saving':      { en: 'Saving…',           sq: 'Po ruhet…' },
  'editor.export':      { en: 'Export',            sq: 'Eksporto' },
  'editor.ai_layout':   { en: 'AI Layout',         sq: 'Modeli AI' },
  'editor.ai_restyle':  { en: 'AI Restyle',        sq: 'Ristilizo me AI' },
  'editor.generating':  { en: 'Generating…',       sq: 'Po gjenerohet…' },
  'editor.restyling':   { en: 'Restyling…',        sq: 'Po ristilizohet…' },
  'editor.pages':       { en: 'Pages',             sq: 'Faqet' },
  'editor.select':      { en: 'Select',            sq: 'Zgjidh' },
  'editor.text':        { en: 'Text',              sq: 'Tekst' },
  'editor.shape':       { en: 'Shape',             sq: 'Formë' },
  'editor.sticker':     { en: 'Sticker',           sq: 'Ngjitës' },
  'editor.photos':      { en: 'Photos',            sq: 'Fotot' },
  'editor.bg':          { en: 'Bg',                sq: 'Sfond' },
  'editor.frames':      { en: 'Frames',            sq: 'Korniza' },
  'editor.del':         { en: 'Del',               sq: 'Fshi' },
  'editor.undo':        { en: 'Undo',              sq: 'Zhbëj' },

  // ── Footer ───────────────────────────────────────────────────────
  'footer.made_in':     { en: 'Made in Kosovo',   sq: 'Bërë në Kosovë' },
  'footer.built_with':  { en: 'Built with Claude', sq: 'Ndërtuar me Claude' },
  'footer.about':       { en: 'About',             sq: 'Rreth nesh' },

  // ── Home/Welcome ─────────────────────────────────────────────────
  'home.welcome_new':   { en: 'Welcome to Folio,', sq: 'Mirë se vini në Folio,' },
  'home.welcome_back':  { en: 'Welcome back,',      sq: 'Mirë se u ktheve,' },
  'home.headline_new_1':{ en: 'Turn photos into',   sq: 'Ktheni fotot në' },
  'home.headline_new_2':{ en: 'beautiful products.', sq: 'produkte të bukura.' },
  'home.headline_back_1':{ en: 'Your memories,',    sq: 'Kujtimet tuaja,' },
  'home.headline_back_2':{ en: 'ready to continue.', sq: 'gati për të vazhduar.' },
  'home.new_project':   { en: 'Start a new project', sq: 'Fillo një projekt të ri' },
  'home.my_projects':   { en: 'My projects',         sq: 'Projektet e mia' },
  'home.how_it_works':  { en: 'How it works',        sq: 'Si funksionon' },
  'home.quick_tips':    { en: 'Quick tips',           sq: 'Këshilla të shpejta' },
  'home.start_creating':{ en: 'Start creating',       sq: 'Fillo të krijoni' },

  // ── Mobile editor ────────────────────────────────────────────────
  'mobile.upload_photos':    { en: 'Upload Photos',       sq: 'Ngarko Foto' },
  'mobile.upload_desc':      { en: 'Add photos to your album. You can arrange them with AI or manually.', sq: 'Shtoni foto në albumin tuaj. Mund t\'i rregulloni me AI ose manualisht.' }, // TODO: review sq
  'mobile.tap_select':       { en: 'Tap to select',       sq: 'Trokitni për të zgjedhur' },
  'mobile.drop_here':        { en: 'Drop here',           sq: 'Hidheni këtu' },
  'mobile.ai_layout':        { en: 'Generate Layout with AI', sq: 'Gjenero Modelin me AI' },
  'mobile.layout_created':   { en: 'Layout created!',     sq: 'Modeli u krijua!' },
  'mobile.preview':          { en: 'Preview Album',       sq: 'Shiko Albumin' },
  'mobile.adjust_style':     { en: 'Adjust Style',        sq: 'Rregulloni Stilin' },
  'mobile.export_pdf':       { en: 'Export as PDF',       sq: 'Eksporto si PDF' },
  'mobile.tip_desktop':      { en: 'For detailed editing, use a tablet or desktop', sq: 'Për redaktim të detajuar, përdorni tablet ose kompjuter' }, // TODO: review sq
  'mobile.add_more':         { en: '+ Add More Photos',   sq: '+ Shtoni Më Shumë Foto' },
  'mobile.photos_count':     { en: 'Photos',              sq: 'Foto' },
}

// ── Main translation function ─────────────────────────────────────────────────
export function t(key: string, lang: Lang = 'en'): string {
  const entry = STRINGS[key]
  if (!entry) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Missing key: "${key}"`)
    }
    return key
  }
  return entry[lang] ?? entry['en'] ?? key
}

// ── Plural helper ─────────────────────────────────────────────────────────────
export function tp(key: string, count: number, lang: Lang = 'en'): string {
  const singular = STRINGS[key]?.[lang] ?? STRINGS[key]?.['en'] ?? key
  if (lang === 'en') {
    const plural = STRINGS[`${key}s`]?.[lang] ?? `${singular}s`
    return count === 1 ? singular : plural
  }
  // Albanian plural forms are complex — use same form for now
  return singular // TODO: review sq plural forms
}
