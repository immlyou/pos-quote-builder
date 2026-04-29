'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocaleStore } from '@/store/locale'
import { Input, Select, Badge, Button } from '@/components/ui'
import { formatUSD } from '@/lib/utils'

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

const STATUS_OPTIONS = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'] as const

const statusColor: Record<string, 'gray' | 'blue' | 'green' | 'red' | 'yellow'> = {
  draft: 'gray',
  sent: 'blue',
  accepted: 'green',
  rejected: 'red',
  expired: 'yellow',
  cancelled: 'gray',
}

export default function QuotesListPage() {
  const { t } = useLocaleStore()
  const [rows, setRows] = useState<QuoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

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
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const res = await fetch(`/api/quotes?${params.toString()}`)
    const json = await res.json()
    setRows(json.quotes ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <h1 className="text-lg font-semibold text-gray-800 mb-4">{t.quoteHistoryTitle}</h1>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchQuotes}
          className="lg:col-span-2"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t.allStatuses}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="lg:col-span-5 flex justify-end">
          <Button size="sm" onClick={load} variant="secondary">
            ↻
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-8">...</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-8">{t.noQuotesYet}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t.quoteNumber}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.customerCol}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.dateCol}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.statusCol}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.totalCol}</th>
                  <th className="px-3 py-2 text-center font-medium">{t.revisionCol}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.actionsCol}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{r.quoteNumber}</td>
                    <td className="px-3 py-2">{r.customerName ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono text-xs">{r.date}</td>
                    <td className="px-3 py-2">
                      <Badge variant={statusColor[r.status] ?? 'gray'}>
                        {statusLabel[r.status] ?? r.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatUSD(parseFloat(r.grandTotal))}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {r.revision > 1 ? `v${r.revision}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/quotes/${r.id}`}
                        className="text-brand-700 hover:underline text-xs font-medium"
                      >
                        {t.view}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
