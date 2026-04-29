import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PricingTier } from '@/types/catalog'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Given MOQ tiers, return the unit price for the given quantity */
export function getTierPrice(tiers: PricingTier[], qty: number): number {
  if (!tiers || tiers.length === 0) return 0
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty)
  let price = sorted[0].price
  for (const tier of sorted) {
    if (qty >= tier.min_qty) price = tier.price
  }
  return price
}

export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function generateQuoteNumber(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const t = String(now.getTime()).slice(-4)
  return `Q${y}${m}${d}-${t}`
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function nextRevisionNumber(quoteNumber: string): string {
  const m = quoteNumber.match(/^(.+)-r(\d+)$/)
  if (m) return `${m[1]}-r${parseInt(m[2], 10) + 1}`
  return `${quoteNumber}-r2`
}

/** Map series code to display label */
export function seriesLabel(s: string): string {
  const map: Record<string, string> = {
    A_E: 'A/E Series',
    G: 'G Series',
    J14: 'J14 Series',
    C: 'C Series',
    BOX_ALFA: 'Box PC Alfa',
    AUDREY2: 'Audrey2',
    M10: 'M10 Mobile',
  }
  return map[s] ?? s
}
