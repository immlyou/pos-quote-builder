'use client'

import { useEffect, useState } from 'react'
import type { LineItem, CompanyProfile, QuoteTotals } from '@/types/quote'

interface SharedQuote {
  id: string
  quoteNumber: string
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
  revision: number
  customerRespondedAt: string | null
}

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [token, setToken] = useState<string | null>(null)
  const [quote, setQuote] = useState<SharedQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    params.then((p) => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error)
        else setQuote(j.quote)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const respond = async (action: 'accepted' | 'rejected') => {
    if (!token) return
    if (
      !confirm(
        action === 'accepted'
          ? 'Confirm acceptance of this quote?'
          : 'Confirm rejection of this quote?'
      )
    )
      return
    setBusy(true)
    const res = await fetch(`/api/share/${token}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    if (!res.ok || !json.ok) {
      alert(json.error ?? 'Action failed')
    } else if (quote) {
      setQuote({
        ...quote,
        status: action,
        customerRespondedAt: new Date().toISOString(),
      })
    }
    setBusy(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    )
  }
  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">404</div>
          <div className="text-sm text-gray-500">{error || 'Quote not found'}</div>
        </div>
      </div>
    )
  }

  const lineItems = quote.selections?.lineItems ?? []
  const profile = quote.profileSnapshot
  const responded = !!quote.customerRespondedAt

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {/* Cover header */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 sm:p-8 border-b-2 border-brand-700 flex flex-col sm:flex-row gap-6 sm:items-start sm:justify-between">
            <div className="flex-1">
              {profile?.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logoDataUrl}
                  alt="logo"
                  className="h-12 mb-3 object-contain"
                />
              ) : null}
              {profile ? (
                <>
                  <div className="text-lg font-bold text-brand-700">{profile.name}</div>
                  {profile.address && (
                    <div className="text-xs text-gray-500 mt-1">{profile.address}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {profile.phone && <span>{profile.phone}</span>}
                    {profile.email && <span>{profile.email}</span>}
                    {profile.taxId && <span>Tax: {profile.taxId}</span>}
                  </div>
                </>
              ) : null}
            </div>
            <div className="sm:text-right">
              <div className="text-2xl font-bold text-brand-700 tracking-wide">QUOTATION</div>
              <div className="mt-3 text-xs space-y-1">
                <div>
                  <span className="text-gray-500">Quote #&nbsp;</span>
                  <span className="font-mono font-semibold">{quote.quoteNumber}</span>
                  {quote.revision > 1 && (
                    <span className="text-gray-400 ml-1">v{quote.revision}</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Issue Date&nbsp;</span>
                  <span className="font-mono">{quote.date}</span>
                </div>
                {quote.expiresAt && (
                  <div>
                    <span className="text-gray-500">Valid Until&nbsp;</span>
                    <span className="font-mono">{quote.expiresAt}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:p-6 border-b border-gray-100">
            <div className="bg-gray-50 rounded p-3">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">
                Bill To
              </div>
              <div className="font-semibold text-gray-800">
                {quote.customerNameSnapshot || '—'}
              </div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">
                Prepared By
              </div>
              <div className="font-semibold text-gray-800">{quote.preparedBy || '—'}</div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="px-4 sm:px-6 pt-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm text-yellow-900">
                <div className="text-xs font-semibold uppercase mb-1">Notes</div>
                <div className="whitespace-pre-wrap">{quote.notes}</div>
              </div>
            </div>
          )}

          {/* Line items */}
          <div className="p-4 sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand-700 mb-2">
              Line Items
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-700 text-white text-xs">
                    <th className="px-2 py-2 text-left font-medium">Category</th>
                    <th className="px-2 py-2 text-left font-medium">Description</th>
                    <th className="px-2 py-2 text-left font-medium">P/N</th>
                    <th className="px-2 py-2 text-right font-medium">Qty</th>
                    <th className="px-2 py-2 text-right font-medium">Unit</th>
                    <th className="px-2 py-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((it, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 1 ? 'bg-blue-50/30' : ''}
                    >
                      <td className="px-2 py-1.5 text-xs text-gray-500">{it.category}</td>
                      <td className="px-2 py-1.5">{it.description}</td>
                      <td className="px-2 py-1.5 font-mono text-xs text-gray-500">
                        {it.pn || ''}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">{it.qty}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{fmt(it.unitPrice)}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{fmt(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 max-w-sm ml-auto space-y-1 text-sm">
              {(
                [
                  ['Base Model', quote.totals.baseModel],
                  ['Upgrades', quote.totals.upgrades],
                  ['Peripherals', quote.totals.peripherals],
                  ['Licenses', quote.totals.licenses],
                  ['Others', quote.totals.others],
                ] as [string, number][]
              )
                .filter(([, v]) => v > 0)
                .map(([label, v]) => (
                  <div key={label} className="flex justify-between text-gray-600">
                    <span>{label}</span>
                    <span className="font-mono">{fmt(v)}</span>
                  </div>
                ))}
              <div className="flex justify-between border-t-2 border-brand-700 pt-2 mt-2 text-lg font-bold text-brand-700">
                <span>GRAND TOTAL</span>
                <span className="font-mono">{fmt(parseFloat(quote.grandTotal))}</span>
              </div>
            </div>
          </div>

          {/* Action area */}
          <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50 rounded-b-lg">
            {responded ? (
              <div className="text-center text-sm">
                {quote.status === 'accepted' ? (
                  <div className="text-green-700">
                    <div className="text-3xl mb-1">✓</div>
                    <div className="font-semibold">Quote Accepted</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Responded {new Date(quote.customerRespondedAt!).toLocaleString()}
                    </div>
                  </div>
                ) : quote.status === 'rejected' ? (
                  <div className="text-red-700">
                    <div className="text-3xl mb-1">✕</div>
                    <div className="font-semibold">Quote Rejected</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Responded {new Date(quote.customerRespondedAt!).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-700">
                    <div className="font-semibold">Already Responded</div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-500 text-center mb-3">
                  Please review the quote above and confirm your decision.
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={() => respond('accepted')}
                    disabled={busy}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md disabled:opacity-50 transition-colors"
                  >
                    ✓ Accept Quote
                  </button>
                  <button
                    onClick={() => respond('rejected')}
                    disabled={busy}
                    className="px-6 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold rounded-md disabled:opacity-50 transition-colors"
                  >
                    ✕ Decline
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 mt-6">
          Powered by Quote Builder · Secure shared link
        </div>
      </div>
    </div>
  )
}
