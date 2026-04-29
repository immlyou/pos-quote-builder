'use client'

import { useState, useMemo } from 'react'
import { useLocaleStore } from '@/store/locale'
import { useQuoteStore } from '@/store/quote'
import { getTierPrice, formatUSD } from '@/lib/utils'
import { Section, Input, QtyInput, Badge } from './ui'
import type { Peripheral } from '@/types/catalog'

interface Props {
  peripherals: Peripheral[]
  modelSeries: string | null
}

// Series that match a given model series
function getMatchingSeries(modelSeries: string | null): string[] {
  if (!modelSeries) return []
  // Map catalog series to peripheral series codes
  // Peripheral series field may contain the series name directly
  const matches: Record<string, string[]> = {
    A_E: ['A_E', 'A/E', 'Universal'],
    G: ['G', 'Universal'],
    J14: ['J14', 'Universal'],
    C: ['C', 'Universal'],
    BOX_ALFA: ['BOX_ALFA', 'BOX', 'Universal'],
  }
  return matches[modelSeries] ?? [modelSeries]
}

export function SectionC({ peripherals, modelSeries }: Props) {
  const { t } = useLocaleStore()
  const { selectedPeripherals, setPeripheralQty } = useQuoteStore()
  const [search, setSearch] = useState('')

  const matchingSeries = getMatchingSeries(modelSeries)

  const filtered = useMemo(() => {
    // Filter: match series OR show all if no model selected
    const byModel = modelSeries
      ? peripherals.filter((p) => {
          if (!p.series) return true
          return matchingSeries.some((s) =>
            p.series.toLowerCase().includes(s.toLowerCase()) ||
            s.toLowerCase().includes(p.series.toLowerCase())
          )
        })
      : peripherals

    // Filter out items with no description AND no pn
    const valid = byModel.filter((p) => p.description || p.pn)

    // Search
    if (!search) return valid
    const q = search.toLowerCase()
    return valid.filter(
      (p) =>
        p.description?.toLowerCase().includes(q) ||
        p.pn?.toLowerCase().includes(q) ||
        p.group?.toLowerCase().includes(q)
    )
  }, [peripherals, modelSeries, matchingSeries, search])

  // Group by group field
  const groups = useMemo(() => {
    const map = new Map<string, Peripheral[]>()
    for (const p of filtered) {
      const g = p.group ?? 'General'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(p)
    }
    return map
  }, [filtered])

  const totalCount = selectedPeripherals.length

  return (
    <Section title={t.peripherals} badge={totalCount}>
      <div className="p-4 space-y-3">
        <Input
          placeholder={t.searchPeripherals}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        {groups.size === 0 && (
          <p className="text-gray-400 text-sm py-4 text-center">{t.noPeripheralsForSeries}</p>
        )}

        {[...groups.entries()].map(([group, items]) => (
          <div key={group} className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">{group}</div>
            {items.map((p, idx) => {
              const key = `${p.series}__${p.pn ?? idx}__${idx}`
              const selected = selectedPeripherals.find((s) => s.key === key)
              const qty = selected?.qty ?? 0

              const getPrice = (q: number) =>
                p.pricing ? getTierPrice(p.pricing, q) : 0

              const unitPrice = getPrice(Math.max(qty, 1))

              return (
                <div key={key} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-xs">
                  <QtyInput
                    value={qty}
                    onChange={(v) => {
                      const up = getPrice(Math.max(v, 1))
                      setPeripheralQty(key, v, {
                        key,
                        description: p.description ?? t.noDescription,
                        pn: p.pn ?? '',
                        series: p.series,
                        unitPrice: up,
                      })
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{p.description ?? t.noDescription}</div>
                    {p.pn && <div className="text-gray-400">{t.pn}: {p.pn}</div>}
                  </div>
                  {p.remark && <span className="text-gray-400 truncate max-w-[120px]">{p.remark}</span>}
                  <div className="shrink-0 text-right w-28">
                    {p.pricing ? (
                      <>
                        <div className="font-mono font-semibold">{formatUSD(unitPrice)}</div>
                        {qty > 0 && (
                          <div className="text-gray-400">×{qty} = {formatUSD(unitPrice * qty)}</div>
                        )}
                        {p.pricing.length > 1 && (
                          <div className="text-gray-300">
                            {p.pricing.map((tier) => `${tier.min_qty}+: $${tier.price}`).join(' | ')}
                          </div>
                        )}
                      </>
                    ) : (
                      <Badge variant="gray">{t.noPricing}</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </Section>
  )
}
