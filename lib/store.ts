import { create } from 'zustand'
import { Album, Page, PageElement, Photo, Frame } from './supabase'

const HISTORY_LIMIT = 20

type AlbumStore = {
  album: Album | null; setAlbum: (album: Album) => void
  currentPageIndex: number; setCurrentPageIndex: (i: number) => void
  photos: Photo[]; setPhotos: (p: Photo[]) => void; addPhoto: (p: Photo) => void
  frames: Frame[]; setFrames: (f: Frame[]) => void; addFrame: (f: Frame) => void
  selectedElementId: string | null; setSelectedElementId: (id: string | null) => void
  addPage: () => void; deletePage: (i: number) => void; updatePage: (i: number, page: Page) => void
  addElement: (pageIndex: number, el: PageElement) => void
  updateElement: (pageIndex: number, id: string, updates: Partial<PageElement>) => void
  deleteElement: (pageIndex: number, id: string) => void
  bringToFront: (pageIndex: number, id: string) => void
  sendToBack: (pageIndex: number, id: string) => void
  isDirty: boolean; setIsDirty: (d: boolean) => void
  history: Album[]; undo: () => void
}

const newPage = (): Page => ({ id: crypto.randomUUID(), background: '#ffffff', elements: [] })

function pushHistory(history: Album[], album: Album | null): Album[] {
  if (!album) return history
  const next = [...history, album]
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
}

export const useAlbumStore = create<AlbumStore>((set, get) => ({
  album: null,
  setAlbum: (album) => set({ album }),

  currentPageIndex: 0,
  setCurrentPageIndex: (i) => set({ currentPageIndex: i }),

  photos: [],
  setPhotos: (photos) => set({ photos }),
  addPhoto: (photo) => set((s) => ({ photos: [...s.photos, photo] })),

  // ── Frames ────────────────────────────────────────────────────────────
  frames: [],
  setFrames: (frames) => set({ frames }),
  addFrame: (frame) => set((s) => ({ frames: [...s.frames, frame] })),

  selectedElementId: null,
  setSelectedElementId: (id) => set({ selectedElementId: id }),

  // ── History ──────────────────────────────────────────────────────────
  history: [],
  undo: () => {
    const { history } = get()
    if (history.length === 0) return
    const prev = history[history.length - 1]
    set({ album: prev, history: history.slice(0, -1), isDirty: true })
  },

  // ── Pages ─────────────────────────────────────────────────────────────
  addPage: () => {
    const { album, history } = get()
    if (!album) return
    set({ album: { ...album, pages: [...album.pages, newPage()] }, isDirty: true, history: pushHistory(history, album) })
  },

  deletePage: (i) => {
    const { album, currentPageIndex, history } = get()
    if (!album || album.pages.length <= 1) return
    const pages = album.pages.filter((_, idx) => idx !== i)
    set({
      album: { ...album, pages },
      currentPageIndex: Math.min(currentPageIndex, pages.length - 1),
      isDirty: true,
      history: pushHistory(history, album),
    })
  },

  updatePage: (i, page) => {
    const { album, history } = get()
    if (!album) return
    set({ album: { ...album, pages: album.pages.map((p, idx) => idx === i ? page : p) }, isDirty: true, history: pushHistory(history, album) })
  },

  // ── Elements ──────────────────────────────────────────────────────────
  addElement: (pageIndex, element) => {
    const { album, history } = get()
    if (!album) return
    set({
      album: { ...album, pages: album.pages.map((p, i) => i !== pageIndex ? p : { ...p, elements: [...p.elements, element] }) },
      isDirty: true,
      history: pushHistory(history, album),
    })
  },

  updateElement: (pageIndex, elementId, updates) => {
    const { album } = get()
    if (!album) return
    set({
      album: {
        ...album,
        pages: album.pages.map((p, i) => i !== pageIndex ? p :
          { ...p, elements: p.elements.map((el) => el.id === elementId ? { ...el, ...updates } : el) }),
      },
      isDirty: true,
    })
  },

  deleteElement: (pageIndex, elementId) => {
    const { album, history } = get()
    if (!album) return
    set({
      album: {
        ...album,
        pages: album.pages.map((p, i) => i !== pageIndex ? p :
          { ...p, elements: p.elements.filter((el) => el.id !== elementId) }),
      },
      selectedElementId: null,
      isDirty: true,
      history: pushHistory(history, album),
    })
  },

  bringToFront: (pageIndex, elementId) => {
    const { album, history } = get()
    if (!album) return
    set({
      album: {
        ...album,
        pages: album.pages.map((p, i) => {
          if (i !== pageIndex) return p
          const el = p.elements.find(e => e.id === elementId)
          if (!el) return p
          return { ...p, elements: [...p.elements.filter(e => e.id !== elementId), el] }
        }),
      },
      isDirty: true,
      history: pushHistory(history, album),
    })
  },

  sendToBack: (pageIndex, elementId) => {
    const { album, history } = get()
    if (!album) return
    set({
      album: {
        ...album,
        pages: album.pages.map((p, i) => {
          if (i !== pageIndex) return p
          const el = p.elements.find(e => e.id === elementId)
          if (!el) return p
          return { ...p, elements: [el, ...p.elements.filter(e => e.id !== elementId)] }
        }),
      },
      isDirty: true,
      history: pushHistory(history, album),
    })
  },

  isDirty: false,
  setIsDirty: (dirty) => set({ isDirty: dirty }),
}))