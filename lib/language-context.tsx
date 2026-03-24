'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Lang } from './i18n'
import { t as translate } from './i18n'

type LangContextValue = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const stored = localStorage.getItem('folio-lang') as Lang | null
    if (stored === 'en' || stored === 'sq') {
      setLangState(stored)
      document.documentElement.setAttribute('lang', stored)
    }
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('folio-lang', l)
    document.documentElement.setAttribute('lang', l)
  }

  const tFn = (key: string) => translate(key, lang)

  return (
    <LangContext.Provider value={{ lang, setLang, t: tFn }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
