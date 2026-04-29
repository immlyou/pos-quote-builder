'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocaleStore } from '@/store/locale'
import { Button } from '@/components/ui'
import { formatUSD } from '@/lib/utils'

interface DashboardData {
  kpi: {
    monthAcceptedTotal: number
    monthAcceptedCount: number
    monthPipelineTotal: number
    monthQuoteCount: number
    monthTotal: number
    winRate: number
    acceptedAllTimeTotal: number
    acceptedAllTimeCount: number
  }
  statusBreakdown: { status: string; count: number; total: number }[]
  topCustomers: { name: string | null; count: number; total: number }[]
  salespersonPerf: {
    preparedBy: string
    quoteCount: number
    acceptedCount: number
    acceptedTotal: number
  }[]
  trend: {
    month: string
    count: number
    acceptedCount: number
    total: number
    acceptedTotal: number
  }[]
  followups: {
    id: string
    quoteNumber: string
    customerName: string | null
    status: string
    date: string
    grandTotal: string
    nextFollowupAt: string
    overdue: boolean
  }[]
  closeMetrics: {
    avgDaysToClose: number | null
    respondedCount: number
  }
}

const STATUS_ORDER = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'] as const

const STATUS_BAR_COLOR: Record<string, string> = {
  draft: 'bg-gray-400',
  sent: 'bg-blue-500',
  accepted: 'bg-green-500',
  rejected: 'bg-red-500',
  expired: 'bg-yellow-500',
  cancelled: 'bg-gray-300',
}

export default function DashboardPage() {
  const { t } = useLocaleStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const statusLabel: Record<string, string> = {
    draft: t.statusDraft,
    sent: t.statusSent,
    accepted: t.statusAccepted,
    rejected: t.statusRejected,
    expired: t.statusExpired,
    cancelled: t.statusCancelled,
  }

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/dashboard')
    setData(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const trendMax = useMemo(() => {
    if (!data) return 1
    return Math.max(1, ...data.trend.map((m) => m.total))
  }, [data])

  const funnelMax = useMemo(() => {
    if (!data) return 1
    return Math.max(1, ...data.statusBreakdown.map((s) => s.count))
  }, [data])

  const totalQuotesAllTime = useMemo(
    () => (data ? data.statusBreakdown.reduce((s, r) => s + r.count, 0) : 0),
    [data]
  )

  if (loading || !data) {
    return <div className="p-6 text-sm text-gray-400">...</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h1 className="text-lg font-semibold text-gray-800">{t.dashboardTitle}</h1>
        <Button size="sm" variant="secondary" onClick={load}>
          ↻
        </Button>
      </div>

      {/* Follow-ups widget — show first if any */}
      {data.followups.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h2 className="font-semibold text-amber-800 text-sm">
              ⏰ {t.followupsTitle}
              <span className="ml-2 font-mono text-xs text-amber-600">
                {data.followups.length}
              </span>
            </h2>
          </div>
          <div className="space-y-1">
            {data.followups.map((f) => (
              <Link
                key={f.id}
                href={`/quotes/${f.id}`}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm hover:bg-white ${
                  f.overdue ? 'bg-red-50 text-red-700' : 'text-amber-800'
                }`}
              >
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-mono text-xs whitespace-nowrap">
                    {f.nextFollowupAt}
                  </span>
                  {f.overdue && (
                    <span className="px-1 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-semibold">
                      {t.overdue}
                    </span>
                  )}
                  <span className="truncate font-medium">{f.customerName ?? '—'}</span>
                  <span className="text-xs opacity-70 truncate">{f.quoteNumber}</span>
                </div>
                <span className="font-mono text-xs whitespace-nowrap">
                  {formatUSD(parseFloat(f.grandTotal))}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi
          label={t.kpiMonthAccepted}
          value={formatUSD(data.kpi.monthAcceptedTotal)}
          sub={`${data.kpi.monthAcceptedCount} ${t.kpiQuotes}`}
          accent="green"
        />
        <Kpi
          label={t.kpiMonthPipeline}
          value={formatUSD(data.kpi.monthPipelineTotal)}
          sub={`${data.kpi.monthQuoteCount} ${t.kpiQuotes}`}
          accent="blue"
        />
        <Kpi
          label={t.kpiWinRate}
          value={`${(data.kpi.winRate * 100).toFixed(1)}%`}
          sub={t.kpiWinRateHint}
          accent="amber"
        />
        <Kpi
          label={t.kpiLifetimeRevenue}
          value={formatUSD(data.kpi.acceptedAllTimeTotal)}
          sub={`${data.kpi.acceptedAllTimeCount} ${t.kpiAcceptedDeals}`}
          accent="brand"
        />
      </div>

      {/* Time-to-close metric */}
      {data.closeMetrics.avgDaysToClose !== null && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 text-sm flex flex-wrap items-baseline gap-3">
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            {t.kpiAvgDaysToClose}
          </span>
          <span className="text-xl font-bold font-mono text-brand-700">
            {data.closeMetrics.avgDaysToClose.toFixed(1)}d
          </span>
          <span className="text-xs text-gray-400">
            ({data.closeMetrics.respondedCount} {t.kpiQuotes})
          </span>
        </div>
      )}

      {/* Trend Chart */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h2 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-3">
          {t.dashboard6MonthTrend}
        </h2>
        {data.trend.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-6">—</div>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {data.trend.map((m) => {
              const totalH = (m.total / trendMax) * 100
              const acceptedH = (m.acceptedTotal / trendMax) * 100
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex-1 flex items-end relative">
                    <div
                      className="w-full bg-gray-200 rounded-t"
                      style={{ height: `${totalH}%` }}
                      title={`${t.kpiTotal}: ${formatUSD(m.total)}`}
                    >
                      <div
                        className="w-full bg-green-500 rounded-t"
                        style={{ height: `${(acceptedH / Math.max(totalH, 0.001)) * 100}%` }}
                        title={`${t.statusAccepted}: ${formatUSD(m.acceptedTotal)}`}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 mt-1">{m.month.slice(5)}</div>
                  <div className="text-[10px] text-gray-400">{m.count}</div>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-sm inline-block" /> {t.statusAccepted}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-200 rounded-sm inline-block" /> {t.kpiTotal}
          </span>
        </div>
      </section>

      {/* Funnel + Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <section className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-3">
            {t.dashboardFunnel}
          </h2>
          <div className="space-y-2">
            {STATUS_ORDER.map((s) => {
              const row = data.statusBreakdown.find((r) => r.status === s) ?? {
                count: 0,
                total: 0,
              }
              const pct = (row.count / Math.max(funnelMax, 1)) * 100
              const sharePct = totalQuotesAllTime > 0 ? (row.count / totalQuotesAllTime) * 100 : 0
              return (
                <div key={s}>
                  <div className="flex items-baseline justify-between text-xs mb-1">
                    <span className="text-gray-600">{statusLabel[s]}</span>
                    <span className="font-mono text-gray-500">
                      {row.count} · {sharePct.toFixed(1)}% · {formatUSD(row.total)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full ${STATUS_BAR_COLOR[s]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-3">
            {t.dashboardTopCustomers}
          </h2>
          {data.topCustomers.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-6">—</div>
          ) : (
            <ol className="space-y-2 text-sm">
              {data.topCustomers.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono w-4">{i + 1}.</span>
                  <Link
                    href={`/quotes?q=${encodeURIComponent(c.name ?? '')}`}
                    className="flex-1 text-gray-800 hover:text-brand-700 truncate"
                  >
                    {c.name}
                  </Link>
                  <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                    {c.count} ·{' '}
                    <span className="font-semibold text-gray-700">{formatUSD(c.total)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Salesperson Performance */}
      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-700 text-xs uppercase tracking-wide">
          {t.dashboardSalesperson}
        </div>
        {data.salespersonPerf.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-6">—</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t.dashboardName}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.dashboardQuotes}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.dashboardAccepted}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.dashboardWinRate}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.dashboardRevenue}</th>
                </tr>
              </thead>
              <tbody>
                {data.salespersonPerf.map((p) => {
                  const wr = p.quoteCount > 0 ? p.acceptedCount / p.quoteCount : 0
                  return (
                    <tr key={p.preparedBy} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-800">{p.preparedBy}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.quoteCount}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.acceptedCount}</td>
                      <td className="px-3 py-2 text-right font-mono">{(wr * 100).toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">
                        {formatUSD(p.acceptedTotal)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub: string
  accent: 'green' | 'blue' | 'amber' | 'brand'
}) {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
  } as const
  return (
    <div className={`rounded-lg border p-3 ${colors[accent]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-xl font-bold font-mono mt-1">{value}</div>
      <div className="text-xs opacity-70 mt-1">{sub}</div>
    </div>
  )
}
