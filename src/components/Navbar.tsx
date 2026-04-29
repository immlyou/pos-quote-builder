'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLocaleStore } from '@/store/locale'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { t, locale, setLocale } = useLocaleStore()
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/login', { method: 'DELETE' })
    router.push('/login')
  }

  const navLinks = [
    { href: '/', label: t.home },
    { href: '/dashboard', label: t.dashboard },
    { href: '/quotes', label: t.quotes },
    { href: '/board', label: t.board },
    { href: '/customers', label: t.customersTab },
    { href: '/settings', label: t.settings },
  ]

  // Hide nav on public-facing pages
  if (pathname?.startsWith('/share/') || pathname === '/login') {
    return null
  }

  return (
    <nav className="bg-brand-700 text-white px-3 sm:px-4 h-11 flex items-center gap-3 sm:gap-6 shrink-0 overflow-x-auto">
      <span className="font-semibold text-white/90 text-sm sm:text-base mr-1 sm:mr-2 whitespace-nowrap">{t.appTitle}</span>
      {navLinks.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            'text-sm hover:text-white transition-colors whitespace-nowrap',
            pathname === l.href ? 'text-white font-medium' : 'text-white/70'
          )}
        >
          {l.label}
        </Link>
      ))}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
          className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded font-mono transition-colors"
        >
          {locale === 'zh' ? 'EN' : '中'}
        </button>
        <button
          onClick={handleLogout}
          className="text-xs text-white/60 hover:text-white transition-colors"
        >
          {t.logout}
        </button>
      </div>
    </nav>
  )
}
