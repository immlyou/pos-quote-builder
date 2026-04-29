'use client'

import { create } from 'zustand'
import type { Locale } from '@/lib/i18n'
import { dict } from '@/lib/i18n'

interface LocaleState {
  locale: Locale
  t: typeof dict.en
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'zh',
  t: dict.zh,
  setLocale: (locale: Locale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', locale)
    }
    set({ locale, t: dict[locale] })
  },
}))

/** Call once on mount to hydrate from localStorage */
export function initLocale() {
  if (typeof window === 'undefined') return
  const saved = localStorage.getItem('locale') as Locale | null
  if (saved === 'en' || saved === 'zh') {
    useLocaleStore.getState().setLocale(saved)
  }
}
