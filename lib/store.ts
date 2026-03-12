import { create } from 'zustand'
import { Album, Page, PageElement, Photo } from './supabase'

type AlbumStore = {
  album: Album | null; setAlbum: (album: Album) => void
  currentPageIndex: number; setCurrentPageIndex: (i: number) => void
  photos: Photo[]; setPhotos: (p: Photo[]) => void; addPhoto: (p: Photo) => void
  selectedElementId: string | null; setSelectedElementId: (id: string | null) => void
  addPage: () => void; deletePage: (i: number) => void; updatePage: (i: number, page: Page) => void
  addElement: (pageIndex: number, el: PageElement) => void
  updateElement: (pageIndex: number, id: string, updates: Partial<PageElement>) => void
  deleteElement: (pageIndex: number, id: string) => void
  isDirty: boolean; setIsDirty: (d: boolean) => void
}

const newPage = (): Page => ({ id: crypto.randomUUID(), background: '#ffffff', elements: [] })

export const useAlbumStore = create<AlbumStore>((set, get) => ({
  album: null, setAlbum: (album) => set({ album }),
  currentPageIndex: 0, setCurrentPageIndex: (i) => set({ currentPageIndex: i }),
  photos: [], setPhotos: (photos) => set({ photos }), addPhoto: (photo) => set((s) => ({ photos: [...s.photos, photo] })),
  selectedElementId: null, setSelectedElementId: (id) => set({ selectedElementId: id }),

  addPage: () => { const { album } = get(); if (!album) return; set({ album: { ...album, pages: [...album.pages, newPage()] }, isDirty: true }) },
  deletePage: (i) => { const { album, currentPageIndex } = get(); if (!album || album.pages.length <= 1) return
    const pages = album.pages.filter((_, idx) => idx !== i)
    set({ album: { ...album, pages }, currentPageIndex: Math.min(currentPageIndex, pages.length - 1), isDirty: true }) },
  updatePage: (i, page) => { const { album } = get(); if (!album) return
    set({ album: { ...album, pages: album.pages.map((p, idx) => idx === i ? page : p) }, isDirty: true }) },

  addElement: (pageIndex, element) => { const { album } = get(); if (!album) return
    set({ album: { ...album, pages: album.pages.map((p, i) => i !== pageIndex ? p : { ...p, elements: [...p.elements, element] }) }, isDirty: true }) },
  updateElement: (pageIndex, elementId, updates) => { const { album } = get(); if (!album) return
    set({ album: { ...album, pages: album.pages.map((p, i) => i !== pageIndex ? p :
      { ...p, elements: p.elements.map((el) => el.id === elementId ? { ...el, ...updates } : el) }) }, isDirty: true }) },
  deleteElement: (pageIndex, elementId) => { const { album } = get(); if (!album) return
    set({ album: { ...album, pages: album.pages.map((p, i) => i !== pageIndex ? p :
      { ...p, elements: p.elements.filter((el) => el.id !== elementId) }) }, selectedElementId: null, isDirty: true }) },

  isDirty: false, setIsDirty: (dirty) => set({ isDirty: dirty }),
}))