'use client'

import { useEffect } from 'react'
import { initLocale } from '@/store/locale'
import { Navbar } from './Navbar'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initLocale()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  )
}
