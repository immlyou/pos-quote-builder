'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocaleStore } from '@/store/locale'
import { useQuoteStore } from '@/store/quote'
import { Button, Badge, Select, Dialog, Input, Textarea, Label } from '@/components/ui'
import { formatUSD } from '@/lib/utils'
import type { LineItem, CompanyProfile, QuoteMeta, QuoteTotals } from '@/types/quote'

interface QuoteDetail {
  id: string
  quoteNumber: string
  customerId: string | null
  customerNameSnapshot: string | null
  status: string
  date: string
  expiresAt: string | null
  preparedBy: string | null
  notes: string | null
  profileSnapshot: CompanyProfile | null
  selections: { lineItems?: LineItem[] } & Record<string, unknown>
  totals: QuoteTotals
  grandTotal: string
  parentQuoteId: string | null
  revision: number
  shareToken: string | null
  sharedAt: string | null
  emailedAt: string | null
  emailedTo: string | null
  sentAt: string | null
  nextFollowupAt: string | null
  viewCount: number
  lastViewedAt: string | null
  customerRespondedAt: string | null
  createdAt: string
  updatedAt: string
}

interface ParentQuoteSummary {
  quoteNumber: string
  grandTotal: string
}

const STATUS_OPTIONS = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled']

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useLocaleStore()
  const router = useRouter()
  const loadFromQuote = useQuoteStore((s) => s.loadFromQuote)
  const duplicateFromQuote = useQuoteStore((s) => s.duplicateFromQuote)
  const [id, setId] = useState<string | null>(null)
  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    message: '',
    includeShareLink: true,
  })
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [followupDraft, setFollowupDraft] = useState<string>('')
  const [parent, setParent] = useState<ParentQuoteSummary | null>(null)

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

  useEffect(() => {
    if (!id) return
    fetch(`/api/quotes/${id}`)
      .then((r) => r.json())
      .then((j) => {
        setQuote(j.quote)
        setFollowupDraft(j.quote?.nextFollowupAt ?? '')
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!quote?.parentQuoteId) {
      setParent(null)
      return
    }
    fetch(`/api/quotes/${quote.parentQuoteId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.quote) {
          setParent({
            quoteNumber: j.quote.quoteNumber,
            grandTotal: j.quote.grandTotal,
          })
        }
      })
      .catch(() => {})
  }, [quote?.parentQuoteId])

  const saveFollowup = async () => {
    if (!quote) return
    setSaving(true)
    await fetch(`/api/quotes/${quote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextFollowupAt: followupDraft || null }),
    })
    setQuote({ ...quote, nextFollowupAt: followupDraft || null })
    setSaving(false)
  }

  const updateStatus = async (next: string) => {
    if (!quote) return
    setSaving(true)
    await fetch(`/api/quotes/${quote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setQuote({ ...quote, status: next })
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!quote) return
    if (!confirm(t.confirmDeleteQuote)) return
    await fetch(`/api/quotes/${quote.id}`, { method: 'DELETE' })
    router.push('/quotes')
  }

  const handleEdit = () => {
    if (!quote) return
    loadFromQuote({
      id: quote.id,
      revision: quote.revision,
      quoteNumber: quote.quoteNumber,
      customerNameSnapshot: quote.customerNameSnapshot,
      date: quote.date,
      preparedBy: quote.preparedBy,
      notes: quote.notes,
      selections: quote.selections as Record<string, unknown>,
    })
    router.push('/')
  }

  const handleShare = async () => {
    if (!quote) return
    const res = await fetch(`/api/quotes/${quote.id}/share`, { method: 'POST' })
    const json = await res.json()
    if (json.ok) {
      const url = `${window.location.origin}/share/${json.token}`
      setShareUrl(url)
      try {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      } catch {}
    }
  }

  const openEmail = () => {
    if (!quote) return
    setEmailForm({
      to: '',
      subject: `Quotation ${quote.quoteNumber}`,
      message: `Please find attached our quotation ${quote.quoteNumber} for your review.`,
      includeShareLink: true,
    })
    setEmailResult(null)
    setEmailDialogOpen(true)
  }

  const handleSendEmail = async () => {
    if (!quote) return
    setEmailSending(true)
    setEmailResult(null)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setEmailResult({ ok: false, msg: json.error ?? `HTTP ${res.status}` })
      } else {
        setEmailResult({ ok: true, msg: `Sent to ${emailForm.to}` })
      }
    } catch (e) {
      setEmailResult({ ok: false, msg: (e as Error).message })
    } finally {
      setEmailSending(false)
    }
  }

  const handleDuplicate = () => {
    if (!quote) return
    duplicateFromQuote({
      quoteNumber: quote.quoteNumber,
      customerNameSnapshot: quote.customerNameSnapshot,
      preparedBy: quote.preparedBy,
      notes: quote.notes,
      selections: quote.selections as Record<string, unknown>,
    })
    router.push('/')
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">...</div>
  }
  if (!quote) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-500 mb-3">404</div>
        <Link href="/quotes" className="text-brand-700 hover:underline text-sm">
          {t.backToList}
        </Link>
      </div>
    )
  }

  const lineItems = quote.selections?.lineItems ?? []
  const meta = {
    customer: quote.customerNameSnapshot ?? '',
    quoteNumber: quote.quoteNumber,
    date: quote.date,
    preparedBy: quote.preparedBy ?? '',
    notes: quote.notes ?? '',
  } satisfies QuoteMeta

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <Link href="/quotes" className="text-xs text-gray-500 hover:text-gray-700">
            ← {t.backToList}
          </Link>
          <h1 className="text-lg font-semibold text-gray-800 mt-1">
            {t.quoteDetail}{' '}
            <span className="font-mono text-sm text-gray-400">#{quote.quoteNumber}</span>
            {quote.revision > 1 && (
              <span className="text-xs text-gray-400 ml-2">v{quote.revision}</span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={quote.status}
            onChange={(e) => updateStatus(e.target.value)}
            disabled={saving}
            className="!w-auto"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="primary" onClick={handleEdit}>
            {t.edit}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleShare}>
            {t.share}
          </Button>
          <Button size="sm" variant="secondary" onClick={openEmail}>
            {t.sendEmail}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleDuplicate}>
            {t.duplicate}
          </Button>
          <Button size="sm" variant="danger" onClick={handleDelete}>
            {t.deleteQuote}
          </Button>
        </div>
      </div>

      {/* Meta + profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">
            {t.companyProfile}
          </div>
          {quote.profileSnapshot ? (
            <div className="text-sm space-y-0.5">
              <div className="font-medium text-gray-800">{quote.profileSnapshot.name}</div>
              {quote.profileSnapshot.address && (
                <div className="text-xs text-gray-500">{quote.profileSnapshot.address}</div>
              )}
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                {quote.profileSnapshot.phone && <span>{quote.profileSnapshot.phone}</span>}
                {quote.profileSnapshot.email && <span>{quote.profileSnapshot.email}</span>}
                {quote.profileSnapshot.taxId && <span>Tax: {quote.profileSnapshot.taxId}</span>}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">{t.noProfile}</div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
          <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">
            Quote Info
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-gray-500">{t.customer}</span>
            <span className="text-gray-800">{meta.customer || '—'}</span>
            <span className="text-gray-500">{t.dateCol}</span>
            <span className="text-gray-800 font-mono">{meta.date}</span>
            <span className="text-gray-500">{t.preparedBy}</span>
            <span className="text-gray-800">{meta.preparedBy || '—'}</span>
            <span className="text-gray-500">{t.statusCol}</span>
            <span>
              <Badge>{statusLabel[quote.status] ?? quote.status}</Badge>
            </span>
            {quote.notes && (
              <>
                <span className="text-gray-500">{t.notes}</span>
                <span className="text-gray-800 whitespace-pre-wrap">{quote.notes}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="px-4 py-2 border-b border-gray-100 font-semibold text-gray-700 text-xs uppercase tracking-wide">
          {t.summaryTitle}
        </div>
        {lineItems.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-6">—</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-left font-medium">Description</th>
                  <th className="px-3 py-2 text-left font-medium">{t.pn}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.qty}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.price}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.subtotal}</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((it, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-xs text-gray-500">{it.category}</td>
                    <td className="px-3 py-2">{it.description}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{it.pn || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{it.qty}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatUSD(it.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatUSD(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity strip: views / sent / emailed / responded */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <ActivityCard
          label={t.activityViews}
          primary={String(quote.viewCount)}
          sub={
            quote.lastViewedAt
              ? new Date(quote.lastViewedAt).toLocaleString()
              : t.activityNotYet
          }
          accent={quote.viewCount > 0 ? 'blue' : 'gray'}
        />
        <ActivityCard
          label={t.activitySent}
          primary={quote.sentAt ? new Date(quote.sentAt).toLocaleDateString() : '—'}
          sub={quote.sentAt ? new Date(quote.sentAt).toLocaleTimeString() : t.activityNotYet}
          accent={quote.sentAt ? 'blue' : 'gray'}
        />
        <ActivityCard
          label={t.activityEmailed}
          primary={quote.emailedAt ? new Date(quote.emailedAt).toLocaleDateString() : '—'}
          sub={quote.emailedTo ?? t.activityNotYet}
          accent={quote.emailedAt ? 'blue' : 'gray'}
        />
        <ActivityCard
          label={t.activityResponded}
          primary={
            quote.customerRespondedAt
              ? new Date(quote.customerRespondedAt).toLocaleDateString()
              : '—'
          }
          sub={
            quote.customerRespondedAt
              ? quote.status === 'accepted'
                ? '✓ ' + t.statusAccepted
                : '✕ ' + t.statusRejected
              : t.activityNotYet
          }
          accent={
            quote.customerRespondedAt
              ? quote.status === 'accepted'
                ? 'green'
                : 'red'
              : 'gray'
          }
        />
      </div>

      {/* Revision diff banner */}
      {quote.revision > 1 && parent && (
        <div className="mb-3 bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs">
          <div className="font-semibold text-purple-800 mb-1">
            {t.revisionDiff} v{quote.revision}
          </div>
          <RevisionDiff
            parent={parent}
            current={parseFloat(quote.grandTotal)}
            currentLabel={quote.quoteNumber}
            t={t}
          />
        </div>
      )}

      {/* Follow-up editor */}
      <div className="mb-4 bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t.nextFollowup}
          </label>
          <Input
            type="date"
            value={followupDraft}
            onChange={(e) => setFollowupDraft(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={saveFollowup} disabled={saving}>
          {saving ? t.saving : t.save}
        </Button>
        {quote.nextFollowupAt && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFollowupDraft('')
              saveFollowup()
            }}
          >
            {t.clear}
          </Button>
        )}
      </div>

      {/* Share URL banner */}
      {shareUrl && (
        <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3 text-xs">
          <div className="font-semibold text-green-800 mb-1">
            {t.shareLinkReady} {shareCopied && <span className="ml-2">✓ {t.copied}</span>}
          </div>
          <input
            value={shareUrl}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            className="w-full font-mono text-xs bg-white border border-green-300 rounded px-2 py-1.5"
          />
        </div>
      )}

      {/* Email Dialog */}
      <Dialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        title={t.sendEmail}
      >
        <div className="space-y-3">
          <div>
            <Label>{t.emailTo} *</Label>
            <Input
              type="email"
              value={emailForm.to}
              onChange={(e) => setEmailForm((f) => ({ ...f, to: e.target.value }))}
              placeholder="customer@example.com"
              className="mt-0.5"
            />
          </div>
          <div>
            <Label>{t.emailSubject}</Label>
            <Input
              value={emailForm.subject}
              onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
              className="mt-0.5"
            />
          </div>
          <div>
            <Label>{t.emailMessage}</Label>
            <Textarea
              value={emailForm.message}
              onChange={(e) => setEmailForm((f) => ({ ...f, message: e.target.value }))}
              rows={4}
              className="mt-0.5"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={emailForm.includeShareLink}
              onChange={(e) =>
                setEmailForm((f) => ({ ...f, includeShareLink: e.target.checked }))
              }
              className="accent-brand-600"
            />
            {t.emailIncludeShareLink}
          </label>
          {emailResult && (
            <div
              className={
                'text-xs rounded p-2 ' +
                (emailResult.ok
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200')
              }
            >
              {emailResult.msg}
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setEmailDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSendEmail} disabled={emailSending || !emailForm.to}>
              {emailSending ? t.sending : t.send}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Totals */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="space-y-1 text-sm max-w-sm ml-auto">
          <div className="flex justify-between">
            <span className="text-gray-500">{t.baseModelTotal}</span>
            <span className="font-mono">{formatUSD(quote.totals.baseModel)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t.upgradesTotal}</span>
            <span className="font-mono">{formatUSD(quote.totals.upgrades)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t.peripheralsTotal}</span>
            <span className="font-mono">{formatUSD(quote.totals.peripherals)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t.licensesTotal}</span>
            <span className="font-mono">{formatUSD(quote.totals.licenses)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t.othersTotal}</span>
            <span className="font-mono">{formatUSD(quote.totals.others)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
            <span>{t.grandTotal}</span>
            <span className="font-mono text-brand-700">{formatUSD(parseFloat(quote.grandTotal))}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityCard({
  label,
  primary,
  sub,
  accent,
}: {
  label: string
  primary: string
  sub: string
  accent: 'gray' | 'blue' | 'green' | 'red'
}) {
  const colors = {
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  } as const
  return (
    <div className={`rounded-lg border p-2.5 ${colors[accent]}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-sm font-bold font-mono mt-0.5 truncate">{primary}</div>
      <div className="text-[10px] opacity-70 truncate">{sub}</div>
    </div>
  )
}

function RevisionDiff({
  parent,
  current,
  currentLabel,
  t,
}: {
  parent: { quoteNumber: string; grandTotal: string }
  current: number
  currentLabel: string
  t: { vs: string; priceDrop: string; priceUp: string; noChange: string }
}) {
  const parentTotal = parseFloat(parent.grandTotal)
  const diff = current - parentTotal
  const pct = parentTotal > 0 ? (diff / parentTotal) * 100 : 0
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  const label = diff < 0 ? t.priceDrop : diff > 0 ? t.priceUp : t.noChange
  const color = diff < 0 ? 'text-green-700' : diff > 0 ? 'text-red-700' : 'text-gray-600'

  const fmt = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="grid grid-cols-3 gap-2 text-xs items-baseline">
      <div>
        <div className="text-[10px] text-purple-600">{parent.quoteNumber}</div>
        <div className="font-mono">{fmt(parentTotal)}</div>
      </div>
      <div className="text-center">
        <div className="text-[10px] text-purple-600">{t.vs}</div>
        <div className={`font-mono font-bold ${color}`}>
          {sign}
          {fmt(Math.abs(diff))}
        </div>
        <div className={`text-[10px] ${color}`}>
          {label} ({sign}
          {Math.abs(pct).toFixed(1)}%)
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] text-purple-600">{currentLabel}</div>
        <div className="font-mono">{fmt(current)}</div>
      </div>
    </div>
  )
}
