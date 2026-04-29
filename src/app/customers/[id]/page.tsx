'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocaleStore } from '@/store/locale'
import { Button, Badge, Input, Textarea, Dialog } from '@/components/ui'
import { formatUSD } from '@/lib/utils'

interface Customer {
  id: string
  code: string | null
  name: string
  contact: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface QuoteRow {
  id: string
  quoteNumber: string
  status: string
  date: string
  grandTotal: string
  revision: number
  parentQuoteId: string | null
  sentAt: string | null
  customerRespondedAt: string | null
  viewCount: number
  lastViewedAt: string | null
  nextFollowupAt: string | null
  createdAt: string
}

interface Stats {
  quoteCount: number
  acceptedCount: number
  acceptedTotal: number
  pendingCount: number
  pendingTotal: number
  winRate: number
  avgRespondDays: number | null
  lastInteraction: string | null
  heat: 'hot' | 'warm' | 'cold' | 'new'
}

const HEAT_STYLE: Record<Stats['heat'], { bg: string; text: string; label: string }> = {
  hot: { bg: 'bg-red-100', text: 'text-red-700', label: '🔥 Hot' },
  warm: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '☀️ Warm' },
  cold: { bg: 'bg-blue-100', text: 'text-blue-700', label: '❄️ Cold' },
  new: { bg: 'bg-gray-100', text: 'text-gray-600', label: '✨ New' },
}

const STATUS_BADGE: Record<string, 'gray' | 'blue' | 'green' | 'red' | 'yellow'> = {
  draft: 'gray',
  sent: 'blue',
  accepted: 'green',
  rejected: 'red',
  expired: 'yellow',
  cancelled: 'gray',
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { t } = useLocaleStore()
  const [id, setId] = useState<string | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<{
    code: string
    name: string
    contact: string
    email: string
    phone: string
    address: string
    notes: string
    tags: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const statusLabel: Record<string, string> = {
    draft: t.statusDraft,
    sent: t.statusSent,
    accepted: t.statusAccepted,
    rejected: t.statusRejected,
    expired: t.statusExpired,
    cancelled: t.statusCancelled,
  }

  useEffect(() => {
    params.then((p) => setId(p.id))
  }, [params])

  const load = async (cid: string) => {
    setLoading(true)
    const res = await fetch(`/api/customers/${cid}`)
    const json = await res.json()
    setCustomer(json.customer)
    setQuotes(json.quotes ?? [])
    setStats(json.stats)
    setLoading(false)
  }

  useEffect(() => {
    if (id) load(id)
  }, [id])

  const openEdit = () => {
    if (!customer) return
    setForm({
      code: customer.code ?? '',
      name: customer.name,
      contact: customer.contact ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      notes: customer.notes ?? '',
      tags: (customer.tags ?? []).join(', '),
    })
    setEditError('')
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!customer || !form) return
    setSaving(true)
    setEditError('')
    const tagsArr = form.tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tags: tagsArr }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok || !json.ok) {
      setEditError(json.error ?? 'Save failed')
      return
    }
    setEditOpen(false)
    if (id) await load(id)
  }

  if (loading || !customer || !stats) {
    return <div className="p-6 text-sm text-gray-400">...</div>
  }

  const heat = HEAT_STYLE[stats.heat]

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="mb-2">
        <Link href="/customers" className="text-xs text-gray-500 hover:text-gray-700">
          ← {t.customersTab}
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {customer.code && (
                <span className="font-mono text-xs text-gray-500">[{customer.code}]</span>
              )}
              <h1 className="text-xl font-semibold text-gray-800">{customer.name}</h1>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${heat.bg} ${heat.text}`}
              >
                {heat.label}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
              {customer.contact && <span>👤 {customer.contact}</span>}
              {customer.email && <span>✉️ {customer.email}</span>}
              {customer.phone && <span>📞 {customer.phone}</span>}
              {customer.address && <span>📍 {customer.address}</span>}
            </div>
            {customer.tags?.length ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {customer.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs border border-brand-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {customer.notes && (
              <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2 whitespace-pre-wrap">
                {customer.notes}
              </div>
            )}
          </div>
          <Button size="sm" onClick={openEdit}>
            {t.edit}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard
          label={t.statTotalQuotes}
          value={String(stats.quoteCount)}
          sub={stats.lastInteraction ? `${t.statLastInteraction}: ${new Date(stats.lastInteraction).toLocaleDateString()}` : '—'}
        />
        <StatCard
          label={t.statAccepted}
          value={String(stats.acceptedCount)}
          sub={formatUSD(stats.acceptedTotal)}
          accent="green"
        />
        <StatCard
          label={t.statPending}
          value={String(stats.pendingCount)}
          sub={formatUSD(stats.pendingTotal)}
          accent="blue"
        />
        <StatCard
          label={t.statWinRate}
          value={`${(stats.winRate * 100).toFixed(0)}%`}
          sub={
            stats.avgRespondDays !== null
              ? `${t.statAvgRespondDays}: ${stats.avgRespondDays.toFixed(1)}d`
              : '—'
          }
          accent="amber"
        />
      </div>

      {/* Quote timeline */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-700 text-xs uppercase tracking-wide">
          {t.statQuoteTimeline}
        </div>
        {quotes.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-8">{t.noQuotesYet}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t.quoteNumber}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.dateCol}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.statusCol}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.totalCol}</th>
                  <th className="px-3 py-2 text-center font-medium">{t.viewsCol}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.followupCol}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.actionsCol}</th>
                </tr>
              </thead>
              <tbody>
                {[...quotes]
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((q) => {
                    const today = new Date().toISOString().slice(0, 10)
                    const overdue =
                      q.nextFollowupAt &&
                      q.nextFollowupAt < today &&
                      !['accepted', 'rejected', 'expired', 'cancelled'].includes(
                        q.status
                      )
                    return (
                      <tr key={q.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs">
                          {q.quoteNumber}
                          {q.revision > 1 && (
                            <span className="text-[10px] text-gray-400 ml-1">v{q.revision}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{q.date}</td>
                        <td className="px-3 py-2">
                          <Badge variant={STATUS_BADGE[q.status] ?? 'gray'}>
                            {statusLabel[q.status] ?? q.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatUSD(parseFloat(q.grandTotal))}
                        </td>
                        <td className="px-3 py-2 text-center text-xs">
                          {q.viewCount > 0 ? (
                            <span className="text-blue-600 font-mono" title={q.lastViewedAt ?? ''}>
                              👁 {q.viewCount}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {q.nextFollowupAt ? (
                            <span
                              className={`font-mono ${
                                overdue ? 'text-red-600 font-semibold' : 'text-gray-600'
                              }`}
                            >
                              {q.nextFollowupAt}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            href={`/quotes/${q.id}`}
                            className="text-brand-700 hover:underline text-xs font-medium"
                          >
                            {t.view}
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t.editCustomer}
      >
        {form && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.codeCol}</label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.nameCol} *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.contactCol}</label>
                <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.phone}</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t.email}</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t.address}</label>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t.tagsLabel} <span className="text-gray-400">({t.tagsHint})</span>
              </label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="VIP, 熱客, 餐飲業"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t.notes}</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
            {editError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                {editError}
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={saveEdit} disabled={saving}>
                {saving ? t.saving : t.save}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent = 'gray',
}: {
  label: string
  value: string
  sub: string
  accent?: 'gray' | 'green' | 'blue' | 'amber'
}) {
  const colors = {
    gray: 'bg-white border-gray-200 text-gray-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  }
  return (
    <div className={`rounded-lg border p-3 ${colors[accent]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-xl font-bold font-mono mt-1">{value}</div>
      <div className="text-xs opacity-70 mt-1 truncate">{sub}</div>
    </div>
  )
}
