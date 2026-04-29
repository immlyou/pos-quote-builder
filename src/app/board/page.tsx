'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocaleStore } from '@/store/locale'
import { Button, Select } from '@/components/ui'
import { formatUSD, cn } from '@/lib/utils'

interface QuoteRow {
  id: string
  quoteNumber: string
  customerName: string | null
  status: string
  date: string
  grandTotal: string
  revision: number
  updatedAt: string
}

const STATUS_ORDER = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'] as const

const COLUMN_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  draft: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
  sent: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  accepted: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  rejected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  expired: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  cancelled: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600' },
}

export default function BoardPage() {
  const { t } = useLocaleStore()
  const [rows, setRows] = useState<QuoteRow[]>([])
  const [loading, setLoading] = useState(true)

  const statusLabel = useMemo<Record<string, string>>(
    () => ({
      draft: t.statusDraft,
      sent: t.statusSent,
      accepted: t.statusAccepted,
      rejected: t.statusRejected,
      expired: t.statusExpired,
      cancelled: t.statusCancelled,
    }),
    [t]
  )

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/quotes?limit=500')
    const json = await res.json()
    setRows(json.quotes ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, QuoteRow[]> = {}
    for (const s of STATUS_ORDER) map[s] = []
    for (const r of rows) {
      ;(map[r.status] ??= []).push(r)
    }
    return map
  }, [rows])

  const columnTotal = (col: string) =>
    (grouped[col] ?? []).reduce((s, r) => s + parseFloat(r.grandTotal), 0)

  const moveQuote = async (id: string, status: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    await fetch(`/api/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h1 className="text-lg font-semibold text-gray-800">{t.boardTitle}</h1>
        <Button size="sm" variant="secondary" onClick={load}>
          {loading ? '...' : '↻'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-3">
        {STATUS_ORDER.map((status) => {
          const items = grouped[status] ?? []
          const styles = COLUMN_STYLE[status]
          return (
            <div
              key={status}
              className={cn('rounded-lg border', styles.border, styles.bg)}
            >
              <div className="px-3 py-2 border-b border-gray-200/60 flex items-center justify-between">
                <div className={`font-semibold text-sm ${styles.text}`}>
                  {statusLabel[status]}
                  <span className="ml-2 text-xs font-mono text-gray-500">
                    {items.length}
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-500">
                  {formatUSD(columnTotal(status))}
                </div>
              </div>
              <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-6">—</div>
                ) : (
                  items.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white border border-gray-200 rounded-md p-2.5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <Link
                          href={`/quotes/${r.id}`}
                          className="font-mono text-xs text-brand-700 hover:underline truncate"
                        >
                          {r.quoteNumber}
                        </Link>
                        {r.revision > 1 && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            v{r.revision}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-800 truncate" title={r.customerName ?? ''}>
                        {r.customerName ?? '—'}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] font-mono text-gray-500">{r.date}</span>
                        <span className="text-xs font-mono font-semibold text-gray-800">
                          {formatUSD(parseFloat(r.grandTotal))}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <Select
                          value={r.status}
                          onChange={(e) => moveQuote(r.id, e.target.value)}
                          className="!py-1 text-xs"
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>
                              → {statusLabel[s]}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
